"use client";

import { useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Descriptions,
  Modal,
  Space,
  Tag,
  message,
} from "antd";
import { CheckCircleFilled, UserOutlined } from "@ant-design/icons";
import QrScanner, { QrScannerHandle } from "./QrScanner";
import { parseRedeemCode } from "@/lib/redeemCode";

interface RedeemOrder {
  id: string;
  openid: string;
  nick: string;
  phone: string;
  avatarUrl: string;
  itemName: string;
  qty: number;
  totalPoints: number;
  storeName: string;
  status: string;
  createdAt: string;
  completedAt: string;
}

type Phase = "scanning" | "confirming" | "done";

export default function RedeemVerifyModal({
  open,
  onClose,
  onCompleted,
}: {
  open: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}) {
  const scannerRef = useRef<QrScannerHandle>(null);
  const [phase, setPhase] = useState<Phase>("scanning");
  const [order, setOrder] = useState<RedeemOrder | null>(null);
  const [completing, setCompleting] = useState(false);

  const reset = () => {
    setPhase("scanning");
    setOrder(null);
    setCompleting(false);
  };

  const handleDecoded = (text: string) => {
    const result = parseRedeemCode(text);
    if ("error" in result) {
      scannerRef.current?.showError(result.error);
      return;
    }

    fetch(`/api/redeem-orders/${encodeURIComponent(result.orderId)}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "查询核销订单失败");
        setOrder(body.order);
        setPhase("confirming");
      })
      .catch((err) => {
        scannerRef.current?.showError(
          err instanceof Error ? err.message : "查询核销订单失败"
        );
      });
  };

  const handleComplete = async () => {
    if (!order) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/redeem-orders/${order.id}/complete`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "核销失败");
      message.success("核销成功");
      setPhase("done");
      onCompleted?.();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "核销失败");
    } finally {
      setCompleting(false);
    }
  };

  return (
    <Modal
      title="扫码核销"
      open={open}
      onCancel={onClose}
      afterOpenChange={(isOpen) => {
        if (!isOpen) reset();
      }}
      destroyOnHidden
      footer={
        phase === "confirming" && order?.status === "pending"
          ? [
              <Button key="cancel" onClick={reset}>
                重新扫码
              </Button>,
              <Button
                key="complete"
                type="primary"
                loading={completing}
                onClick={handleComplete}
              >
                确认完成
              </Button>,
            ]
          : phase !== "scanning"
            ? [
                <Button key="rescan" type="primary" onClick={reset}>
                  扫下一个
                </Button>,
              ]
            : null
      }
    >
      {phase === "scanning" && (
        <QrScanner
          ref={scannerRef}
          onDecode={handleDecoded}
          description="扫描用户小程序里的兑换核销码，核对无误后确认完成。"
        />
      )}

      {phase !== "scanning" && order && (
        <Space orientation="vertical" style={{ width: "100%" }} size="large">
          <Space align="center" size="middle">
            <Avatar
              size={56}
              src={order.avatarUrl || undefined}
              icon={<UserOutlined />}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {order.nick || "（未设置昵称）"}
              </div>
              <div style={{ color: "rgba(0,0,0,0.45)" }}>
                {order.phone || "未绑定手机号"}
              </div>
            </div>
          </Space>

          {order.status === "done" && (
            <Alert
              type="success"
              showIcon
              icon={<CheckCircleFilled />}
              title="该订单已经核销过了"
              description={
                order.completedAt
                  ? `完成时间：${new Date(order.completedAt).toLocaleString("zh-CN")}`
                  : undefined
              }
            />
          )}

          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="商品">
              {order.itemName} x {order.qty}
            </Descriptions.Item>
            <Descriptions.Item label="消耗积分">
              {order.totalPoints}
            </Descriptions.Item>
            <Descriptions.Item label="门店">
              {order.storeName || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="下单时间">
              {order.createdAt
                ? new Date(order.createdAt).toLocaleString("zh-CN")
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={order.status === "done" ? "green" : "gold"}>
                {order.status === "done" ? "已完成" : "制作中"}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </Space>
      )}
    </Modal>
  );
}
