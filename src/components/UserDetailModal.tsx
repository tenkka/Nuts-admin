"use client";

import { useState } from "react";
import {
  Avatar,
  Button,
  Descriptions,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Space,
} from "antd";
import { UserOutlined } from "@ant-design/icons";

export interface UserRecord {
  id: string;
  nick: string;
  phone: string;
  openid: string;
  avatarUrl: string;
  /** 旧的战力值，可直接编辑 */
  power: number;
  /** 积分余额，来自 user_points 集合，只能在积分管理页调整（要写流水） */
  points: number;
  rechargeBalance: number;
  giftBalance: number;
  lotteryTickets: number;
  inviteCode: string;
  champion: number;
  createdAt: string;
}

type EditableFields = Pick<
  UserRecord,
  | "nick"
  | "phone"
  | "power"
  | "rechargeBalance"
  | "giftBalance"
  | "lotteryTickets"
  | "inviteCode"
  | "champion"
>;

export default function UserDetailModal({
  user,
  open,
  onClose,
  onUpdated,
  onDeleted,
}: {
  user: UserRecord | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (user: UserRecord) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form] = Form.useForm<EditableFields>();

  if (!user) return null;

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "保存失败");
      onUpdated({ ...user, ...values });
      message.success("保存成功");
      setEditing(false);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "删除失败");
      message.success("删除成功");
      onDeleted(user.id);
      onClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      title="用户详情"
      open={open}
      onCancel={onClose}
      afterOpenChange={(isOpen) => {
        if (!isOpen) setEditing(false);
      }}
      destroyOnHidden
      footer={
        editing
          ? [
              <Button key="cancel" onClick={() => setEditing(false)}>
                取消
              </Button>,
              <Button key="save" type="primary" loading={saving} onClick={handleSave}>
                保存
              </Button>,
            ]
          : [
              <Popconfirm
                key="delete"
                title="确定删除该用户吗？"
                description="删除后不可恢复"
                okText="删除"
                okButtonProps={{ danger: true }}
                cancelText="取消"
                onConfirm={handleDelete}
              >
                <Button danger loading={deleting}>
                  删除
                </Button>
              </Popconfirm>,
              <Button key="edit" type="primary" onClick={() => setEditing(true)}>
                编辑
              </Button>,
            ]
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <div style={{ textAlign: "center" }}>
          <Avatar
            size={64}
            src={user.avatarUrl || undefined}
            icon={<UserOutlined />}
          />
        </div>

        {editing ? (
          <Form form={form} layout="vertical" initialValues={user}>
            <Form.Item label="昵称" name="nick">
              <Input />
            </Form.Item>
            <Form.Item label="手机号" name="phone">
              <Input />
            </Form.Item>
            <Form.Item label="战力" name="power">
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="充值余额" name="rechargeBalance">
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="赠送余额" name="giftBalance">
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="抽奖券" name="lotteryTickets">
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="邀请码" name="inviteCode">
              <Input />
            </Form.Item>
            <Form.Item label="冠军次数" name="champion">
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
          </Form>
        ) : (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="ID">{user.id}</Descriptions.Item>
            <Descriptions.Item label="openid">{user.openid}</Descriptions.Item>
            <Descriptions.Item label="昵称">{user.nick}</Descriptions.Item>
            <Descriptions.Item label="手机号">{user.phone || "-"}</Descriptions.Item>
            <Descriptions.Item label="积分">
              {user.points}
              <span style={{ color: "rgba(0,0,0,0.45)", marginLeft: 8 }}>
                （在积分管理页调整）
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="战力">{user.power}</Descriptions.Item>
            <Descriptions.Item label="充值余额">
              {user.rechargeBalance}
            </Descriptions.Item>
            <Descriptions.Item label="赠送余额">{user.giftBalance}</Descriptions.Item>
            <Descriptions.Item label="抽奖券">
              {user.lotteryTickets}
            </Descriptions.Item>
            <Descriptions.Item label="邀请码">
              {user.inviteCode || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="冠军次数">{user.champion}</Descriptions.Item>
            <Descriptions.Item label="注册时间">
              {user.createdAt
                ? new Date(user.createdAt).toLocaleString("zh-CN")
                : "-"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Space>
    </Modal>
  );
}
