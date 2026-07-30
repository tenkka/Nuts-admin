const iconv = require("iconv-lite");

const ESC = 0x1b;
const GS = 0x1d;

const ALIGN_CODES = { left: 0, center: 1, right: 2 };

/**
 * 大多数国产热敏小票打印机内置字库是 GBK，不是 UTF-8，
 * 中文文本必须转成 GBK 字节再发送，否则打出来是乱码。
 */
function textBytes(text) {
  return iconv.encode(String(text ?? ""), "gbk");
}

function buildReceipt({ lines = [], feed = 3, cut = true }) {
  const chunks = [Buffer.from([ESC, 0x40])]; // 初始化打印机

  for (const line of lines) {
    const align = ALIGN_CODES[line.align] ?? ALIGN_CODES.left;
    chunks.push(Buffer.from([ESC, 0x61, align]));

    if (line.bold) chunks.push(Buffer.from([ESC, 0x45, 1]));
    if (line.size === "double") chunks.push(Buffer.from([GS, 0x21, 0x11]));

    chunks.push(textBytes(line.text));
    chunks.push(Buffer.from([0x0a]));

    if (line.size === "double") chunks.push(Buffer.from([GS, 0x21, 0x00]));
    if (line.bold) chunks.push(Buffer.from([ESC, 0x45, 0]));
  }

  if (feed > 0) chunks.push(Buffer.alloc(feed, 0x0a));
  if (cut) chunks.push(Buffer.from([GS, 0x56, 0x00]));

  return Buffer.concat(chunks);
}

module.exports = { buildReceipt };
