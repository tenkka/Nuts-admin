"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Tag,
  message,
} from "antd";
import { UserOutlined } from "@ant-design/icons";

export interface GameRanking {
  userId: string;
  openid: string;
  nick: string;
  phone: string;
  avatarUrl: string;
  totalPower: number;
  championCount: number;
  updatedAt: string;
}

export interface Store {
  id: number;
  name: string;
  city: string;
}

interface AdjustFormValues {
  storeId: number;
  powerDelta?: number;
  championDelta?: number;
  note?: string;
}

interface GameLog {
  id: string;
  storeId: number | null;
  powerDelta: number;
  championDelta: number;
  source: string;
  note: string;
  createdAt: string;
}

function deltaText(value: number) {
  if (!value) return null;
  return value > 0 ? `+${value}` : String(value);
}

function GameLogHistory({
  openid,
  storeNameOf,
}: {
  openid: string;
  storeNameOf: (id: number | null) => string;
}) {
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/game-stats/logs?openid=${encodeURIComponent(openid)}&size=50`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "加载流水失败");
        setLogs(body.logs);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [openid]);

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>战力/冠军流水</div>
      {error && (
        <Alert
          type="error"
          title="加载失败"
          description={error}
          style={{ marginBottom: 12 }}
          showIcon
        />
      )}
      <Spin spinning={loading}>
        {logs.length === 0 && !loading ? (
          <Empty description="暂无记录" />
        ) : (
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "8px 0",
                  borderBottom: "1px solid rgba(5, 5, 5, 0.06)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <Space size={4}>
                    <span>{log.note || "-"}</span>
                    <Tag>{storeNameOf(log.storeId)}</Tag>
                    {log.source === "admin" && <Tag color="blue">管理员操作</Tag>}
                  </Space>
                  <div style={{ fontSize: 12, color: "rgba(0, 0, 0, 0.45)" }}>
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString("zh-CN")
                      : "-"}
                  </div>
                </div>
                <Space size={12} style={{ whiteSpace: "nowrap" }}>
                  {deltaText(log.powerDelta) && (
                    <span
                      style={{
                        fontWeight: 600,
                        color: log.powerDelta > 0 ? "#3f8600" : "#cf1322",
                      }}
                    >
                      战力{deltaText(log.powerDelta)}
                    </span>
                  )}
                  {deltaText(log.championDelta) && (
                    <span
                      style={{
                        fontWeight: 600,
                        color: log.championDelta > 0 ? "#3f8600" : "#cf1322",
                      }}
                    >
                      冠军{deltaText(log.championDelta)}
                    </span>
                  )}
                </Space>
              </div>
            ))}
          </div>
        )}
      </Spin>
    </div>
  );
}

export default function GameStatsDetailModal({
  record,
  stores,
  defaultStoreId,
  open,
  onClose,
  onAdjusted,
}: {
  record: GameRanking | null;
  stores: Store[];
  defaultStoreId: number | null;
  open: boolean;
  onClose: () => void;
  onAdjusted: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form] = Form.useForm<AdjustFormValues>();

  if (!record) return null;

  const storeNameOf = (id: number | null) =>
    stores.find((s) => s.id === id)?.name ?? (id ? `门店#${id}` : "-");

  const handleAdjust = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const res = await fetch("/api/game-stats/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openid: record.openid,
          storeId: values.storeId,
          powerDelta: values.powerDelta ?? 0,
          championDelta: values.championDelta ?? 0,
          note: values.note,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "调整失败");

      message.success(
        `操作成功，${storeNameOf(values.storeId)} 战力 ${body.totalPower}，冠军次数 ${body.championCount}`
      );
      form.resetFields(["powerDelta", "championDelta", "note"]);
      setRefreshKey((key) => key + 1);
      onAdjusted();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "调整失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="战力详情"
      open={open}
      onCancel={onClose}
      destroyOnHidden
      width={640}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
    >
      <Space orientation="vertical" style={{ width: "100%" }} size="large">
        <Space align="center" size="middle">
          <Avatar
            size={56}
            src={record.avatarUrl || undefined}
            icon={<UserOutlined />}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>
              {record.nick || "（未设置昵称）"}
            </div>
            <div style={{ color: "rgba(0,0,0,0.45)" }}>
              {record.phone || "未绑定手机号"}
            </div>
          </div>
        </Space>

        <Row gutter={16}>
          <Col span={12}>
            <Statistic title="战力（当前筛选范围）" value={record.totalPower} />
          </Col>
          <Col span={12}>
            <Statistic title="冠军次数（当前筛选范围）" value={record.championCount} />
          </Col>
        </Row>

        <Form
          form={form}
          layout="inline"
          initialValues={{ storeId: defaultStoreId ?? stores[0]?.id }}
          style={{ rowGap: 8 }}
        >
          <Form.Item
            name="storeId"
            rules={[{ required: true, message: "请选择门店" }]}
          >
            <Select
              style={{ width: 160 }}
              placeholder="选择门店"
              options={stores.map((s) => ({ label: s.name, value: s.id }))}
            />
          </Form.Item>
          <Form.Item name="powerDelta">
            <InputNumber precision={0} placeholder="战力变化，如 +30" />
          </Form.Item>
          <Form.Item name="championDelta">
            <InputNumber precision={0} placeholder="冠军次数变化，如 +1" />
          </Form.Item>
          <Form.Item name="note" style={{ flex: 1, minWidth: 160 }}>
            <Input placeholder="备注（可选）" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" loading={submitting} onClick={handleAdjust}>
              提交
            </Button>
          </Form.Item>
        </Form>

        <GameLogHistory
          key={`${record.openid}:${refreshKey}`}
          openid={record.openid}
          storeNameOf={storeNameOf}
        />
      </Space>
    </Modal>
  );
}
