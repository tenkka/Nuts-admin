"use client";

import { useEffect, useState } from "react";
import { Alert, Avatar, Table } from "antd";
import { UserOutlined } from "@ant-design/icons";
import AdminLayout from "@/components/AdminLayout";
import UserDetailModal, { UserRecord } from "@/components/UserDetailModal";

const columns = [
  {
    title: "头像",
    dataIndex: "avatarUrl",
    key: "avatarUrl",
    render: (url: string) => <Avatar src={url || undefined} icon={<UserOutlined />} />,
  },
  { title: "昵称", dataIndex: "nick", key: "nick" },
  { title: "手机号", dataIndex: "phone", key: "phone" },
  { title: "积分", dataIndex: "power", key: "power" },
  { title: "充值余额", dataIndex: "rechargeBalance", key: "rechargeBalance" },
  { title: "赠送余额", dataIndex: "giftBalance", key: "giftBalance" },
  { title: "抽奖券", dataIndex: "lotteryTickets", key: "lotteryTickets" },
  { title: "邀请码", dataIndex: "inviteCode", key: "inviteCode" },
  {
    title: "注册时间",
    dataIndex: "createdAt",
    key: "createdAt",
    render: (v: string) => (v ? new Date(v).toLocaleString("zh-CN") : "-"),
  },
];

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetch("/api/users")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "加载用户失败");
        setUsers(body.users);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <h2 style={{ marginBottom: 24 }}>用户管理</h2>
      {error && (
        <Alert
          type="error"
          title="加载失败"
          description={error}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={users}
        loading={loading}
        scroll={{ x: "max-content" }}
        onRow={(record) => ({
          onClick: () => {
            setSelectedUser(record);
            setModalOpen(true);
          },
          style: { cursor: "pointer" },
        })}
      />
      <UserDetailModal
        user={selectedUser}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onUpdated={(updated) => {
          setSelectedUser(updated);
          setUsers((prev) =>
            prev.map((u) => (u.id === updated.id ? updated : u))
          );
        }}
        onDeleted={(id) => {
          setUsers((prev) => prev.filter((u) => u.id !== id));
        }}
      />
    </AdminLayout>
  );
}
