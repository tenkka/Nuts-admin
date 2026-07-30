"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Input,
  List,
  message,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";
import { PrinterOutlined, ScanOutlined } from "@ant-design/icons";
import AdminLayout from "@/components/AdminLayout";
import {
  checkAgentHealth,
  getAgentBaseUrl,
  listPrinters,
  printReceipt,
  selectPrinter,
  setAgentBaseUrl,
} from "@/lib/printAgent";

const { Text, Paragraph } = Typography;
const SCAN_STORAGE_KEY = "nuts_scanner_listener_enabled";

export default function DevicesPage() {
  const [agentOnline, setAgentOnline] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [baseUrl, setBaseUrl] = useState("");
  const [printers, setPrinters] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [scanEnabled, setScanEnabled] = useState(false);
  const [scanLog, setScanLog] = useState<string[]>([]);

  const refresh = () =>
    checkAgentHealth()
      .then(() => {
        setAgentOnline(true);
        return listPrinters();
      })
      .then(({ printers: list, selected: cur }) => {
        setPrinters(list);
        setSelected(cur ?? undefined);
      })
      .catch(() => {
        setAgentOnline(false);
      })
      .finally(() => {
        setChecking(false);
      });

  useEffect(() => {
    refresh().then(() => {
      setBaseUrl(getAgentBaseUrl());
      setScanEnabled(window.localStorage.getItem(SCAN_STORAGE_KEY) === "1");
    });
  }, []);

  const handleSaveUrl = () => {
    setAgentBaseUrl(baseUrl);
    message.success("已保存代理地址");
    setChecking(true);
    refresh();
  };

  const handleSaveSelection = async () => {
    if (!selected) {
      message.error("请先选择一台打印机");
      return;
    }
    setSaving(true);
    try {
      await selectPrinter(selected);
      message.success("已保存打印机选择");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleTestPrint = async () => {
    setTesting(true);
    try {
      await printReceipt({
        lines: [
          { text: "Nuts后台管理", align: "center", bold: true, size: "double" },
          { text: "测试打印", align: "center" },
          { text: "--------------------------------" },
          { text: `打印机：${selected ?? "-"}` },
          { text: new Date().toLocaleString("zh-CN") },
        ],
        feed: 3,
        cut: true,
      });
      message.success("已发送打印请求");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "打印失败");
    } finally {
      setTesting(false);
    }
  };

  const toggleScanListener = (checked: boolean) => {
    setScanEnabled(checked);
    window.localStorage.setItem(SCAN_STORAGE_KEY, checked ? "1" : "0");
  };

  // 扫码枪是键盘模拟设备，浏览器分辨不出它和真键盘的区别，
  // 也没有"选择哪个扫码枪"这种权限概念。这里用按键速度做启发式识别：
  // 扫码枪几毫秒内打完一整串字符，人手速度做不到。
  const bufferRef = useRef("");
  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (!scanEnabled) return;

    const FAST_GAP_MS = 50;
    const MIN_LENGTH = 3;

    const onKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const gap = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (e.key === "Enter") {
        if (bufferRef.current.length >= MIN_LENGTH) {
          const code = bufferRef.current;
          setScanLog((prev) => [code, ...prev].slice(0, 20));
        }
        bufferRef.current = "";
        return;
      }

      if (e.key.length !== 1) return; // 忽略 Shift/Ctrl 等控制键

      if (gap > FAST_GAP_MS * 4) {
        bufferRef.current = e.key;
      } else {
        bufferRef.current += e.key;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [scanEnabled]);

  return (
    <AdminLayout>
      <h2 style={{ marginBottom: 24 }}>设备管理</h2>

      <Card
        title={
          <Space>
            <PrinterOutlined /> 热敏小票打印机
          </Space>
        }
        style={{ marginBottom: 24 }}
        loading={checking}
      >
        {agentOnline === false && (
          <Alert
            type="warning"
            showIcon
            title="未连接到本地打印代理"
            description={
              <>
                <Paragraph style={{ marginBottom: 8 }}>
                  浏览器无法直接访问 USB
                  打印机，需要在这台电脑上运行本地打印代理服务（详见项目里的
                  print-agent/README.md）。请确认代理已经启动，或者下面地址填的
                  端口是否正确。
                </Paragraph>
                <Space>
                  <Input
                    style={{ width: 260 }}
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="http://127.0.0.1:9527"
                  />
                  <Button onClick={handleSaveUrl}>保存并重试</Button>
                </Space>
              </>
            }
            style={{ marginBottom: 16 }}
          />
        )}

        {agentOnline && (
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Space>
              <Tag color="green">代理已连接</Tag>
              <Text type="secondary">{baseUrl}</Text>
            </Space>
            <Space>
              <Select
                style={{ width: 280 }}
                placeholder="选择打印机"
                value={selected}
                onChange={setSelected}
                options={printers.map((p) => ({ label: p, value: p }))}
              />
              <Button type="primary" loading={saving} onClick={handleSaveSelection}>
                保存选择
              </Button>
              <Button loading={testing} onClick={handleTestPrint} disabled={!selected}>
                测试打印
              </Button>
            </Space>
          </Space>
        )}
      </Card>

      <Card
        title={
          <Space>
            <ScanOutlined /> 扫码枪
          </Space>
        }
      >
        <Paragraph type="secondary">
          扫码枪一般是&ldquo;键盘模拟&rdquo;设备，插上后当键盘用，扫码等于自动打字 +
          回车。浏览器出于防键盘记录的安全限制，无法把它和普通键盘区分开，也就
          没有&ldquo;选择哪个扫码枪&rdquo;这一步——只要页面上有输入框在等待输入，就能收到
          扫码内容。
        </Paragraph>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Space>
            <span>启用全局扫码监听（测试用）</span>
            <Switch checked={scanEnabled} onChange={toggleScanListener} />
          </Space>
          {scanEnabled && (
            <>
              <Input placeholder="在这里点一下，然后试着扫码/手动输入测试" />
              <List
                size="small"
                header="最近识别到的扫码内容"
                bordered
                dataSource={scanLog}
                locale={{ emptyText: "还没有识别到扫码" }}
                renderItem={(item) => <List.Item>{item}</List.Item>}
              />
            </>
          )}
        </Space>
      </Card>
    </AdminLayout>
  );
}
