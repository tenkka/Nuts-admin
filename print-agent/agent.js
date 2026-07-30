const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");
const express = require("express");
const { buildReceipt } = require("./escpos");

const CONFIG_PATH = path.join(__dirname, "config.json");
const SCRIPTS_DIR = path.join(__dirname, "scripts");
const DEFAULT_CONFIG = { port: 9527, selectedPrinter: null };

function loadConfig() {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

let config = loadConfig();

function runPowerShellScript(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(SCRIPTS_DIR, scriptName);
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath, ...args],
      { maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr?.trim() || error.message));
          return;
        }
        resolve(stdout.trim());
      }
    );
  });
}

const app = express();
app.use(express.json({ limit: "2mb" }));

// 本地代理只监听 127.0.0.1，风险面很小；这里统一放开跨域，
// 并显式回应 Chrome Private Network Access 的预检请求，
// 否则 HTTPS 页面访问 http://127.0.0.1 会被浏览器拦下来。
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, version: "1.0.0", selectedPrinter: config.selectedPrinter });
});

app.get("/printers", async (_req, res) => {
  try {
    const stdout = await runPowerShellScript("list-printers.ps1");
    const parsed = JSON.parse(stdout || "[]");
    const printers = Array.isArray(parsed) ? parsed : [parsed];
    res.json({ printers, selected: config.selectedPrinter });
  } catch (error) {
    res.status(500).json({ error: error.message || "读取打印机列表失败" });
  }
});

app.post("/printer/select", (req, res) => {
  const { name } = req.body || {};
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "缺少打印机名称" });
    return;
  }
  config.selectedPrinter = name;
  saveConfig(config);
  res.json({ ok: true, selectedPrinter: name });
});

app.post("/print", async (req, res) => {
  if (!config.selectedPrinter) {
    res.status(400).json({ error: "尚未选择打印机，请先在设备管理页面选择" });
    return;
  }

  const { lines, feed, cut } = req.body || {};
  if (!Array.isArray(lines) || lines.length === 0) {
    res.status(400).json({ error: "打印内容不能为空" });
    return;
  }

  const buffer = buildReceipt({ lines, feed, cut });
  const tmpFile = path.join(os.tmpdir(), `nuts-print-${crypto.randomUUID()}.bin`);

  try {
    fs.writeFileSync(tmpFile, buffer);
    const stdout = await runPowerShellScript("raw-print.ps1", [
      "-PrinterName",
      config.selectedPrinter,
      "-FilePath",
      tmpFile,
    ]);
    const result = JSON.parse(stdout);
    if (!result.ok) throw new Error(result.error || "打印失败");
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message || "打印失败" });
  } finally {
    fs.unlink(tmpFile, () => {});
  }
});

app.listen(config.port, "127.0.0.1", () => {
  console.log(`Nuts 打印/扫码代理已启动：http://127.0.0.1:${config.port}`);
  console.log(`当前选定打印机：${config.selectedPrinter || "（未选择）"}`);
});
