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
  Radio,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  message,
} from "antd";
import { UserOutlined } from "@ant-design/icons";
import { pointsSourceLabel } from "@/lib/points";

export interface PointAccount {
  userId: string;
  openid: string;
  nick: string;
  phone: string;
  avatarUrl: string;
  hasAccount: boolean;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  updatedAt: string;
}

interface Transaction {
  id: string;
  delta: number;
  type: string;
  source: string;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

interface AdjustFormValues {
  direction: "add" | "deduct";
  amount: number;
  description?: string;
}

const HISTORY_SIZE = 50;

/**
 * 单个用户的积分流水。靠外层的 key 重新挂载来刷新，
 * 这样每次打开/调整后都是干净的加载状态。
 */
function PointsHistory({ openid }: { openid: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(
      `/api/points/transactions?openid=${encodeURIComponent(
        openid
      )}&size=${HISTORY_SIZE}`
    )
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "加载积分流水失败");
        setTransactions(body.transactions);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [openid]);

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>积分流水</div>
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
        {transactions.length === 0 && !loading ? (
          <Empty description="暂无积分记录" />
        ) : (
          // antd v6 的 List 已废弃，这里用普通列表渲染
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {transactions.map((tx) => (
              <div
                key={tx.id}
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
                    <span>{tx.description || "-"}</span>
                    <Tag>{pointsSourceLabel(tx.source)}</Tag>
                  </Space>
                  <div style={{ fontSize: 12, color: "rgba(0, 0, 0, 0.45)" }}>
                    {tx.createdAt
                      ? new Date(tx.createdAt).toLocaleString("zh-CN")
                      : "-"}
                    {" · 余额 "}
                    {tx.balanceBefore} → {tx.balanceAfter}
                  </div>
                </div>
                <span
                  style={{
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    color: tx.delta >= 0 ? "#3f8600" : "#cf1322",
                  }}
                >
                  {tx.delta >= 0 ? `+${tx.delta}` : tx.delta}
                </span>
              </div>
            ))}
          </div>
        )}
      </Spin>
    </div>
  );
}

export default function PointsDetailModal({
  account,
  open,
  onClose,
  onAdjusted,
}: {
  account: PointAccount | null;
  open: boolean;
  onClose: () => void;
  onAdjusted: (openid: string, balanceAfter: number, delta: number) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form] = Form.useForm<AdjustFormValues>();

  if (!account) return null;

  const handleAdjust = async () => {
    const values = await form.validateFields();
    const delta =
      values.direction === "deduct"
        ? -Math.abs(values.amount)
        : Math.abs(values.amount);

    setSubmitting(true);
    try {
      const res = await fetch("/api/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openid: account.openid,
          amount: delta,
          description: values.description,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "调整积分失败");

      message.success(`操作成功，当前余额 ${body.balanceAfter}`);
      onAdjusted(account.openid, body.balanceAfter, delta);
      form.resetFields();
      setRefreshKey((key) => key + 1);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "调整积分失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="积分详情"
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
            src={account.avatarUrl || undefined}
            icon={<UserOutlined />}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>
              {account.nick || "（未设置昵称）"}
            </div>
            <div style={{ color: "rgba(0,0,0,0.45)" }}>
              {account.phone || "未绑定手机号"}
            </div>
          </div>
        </Space>

        <Row gutter={16}>
          <Col span={8}>
            <Statistic title="当前积分" value={account.balance} />
          </Col>
          <Col span={8}>
            <Statistic title="累计获得" value={account.totalEarned} />
          </Col>
          <Col span={8}>
            <Statistic title="累计消耗" value={account.totalSpent} />
          </Col>
        </Row>

        <Form
          form={form}
          layout="inline"
          initialValues={{ direction: "add" }}
          style={{ rowGap: 8 }}
        >
          <Form.Item name="direction">
            <Radio.Group
              optionType="button"
              options={[
                { label: "增加", value: "add" },
                { label: "扣除", value: "deduct" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="amount"
            rules={[{ required: true, message: "请输入积分数量" }]}
          >
            <InputNumber min={1} precision={0} placeholder="积分数量" />
          </Form.Item>
          <Form.Item name="description" style={{ flex: 1, minWidth: 160 }}>
            <Input placeholder="备注（可选）" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" loading={submitting} onClick={handleAdjust}>
              提交
            </Button>
          </Form.Item>
        </Form>

        <PointsHistory key={`${account.openid}:${refreshKey}`} openid={account.openid} />
      </Space>
    </Modal>
  );
}
