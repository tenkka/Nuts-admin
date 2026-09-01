"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Avatar, Input, Table } from "antd";
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
  { title: "积分", dataIndex: "points", key: "points" },
  { title: "战力", dataIndex: "power", key: "power" },
  {
    title: "充值余额",
    dataIndex: "rechargeBalance",
    key: "rechargeBalance",
    render: (v: number) => (v ?? 0).toFixed(2),
  },
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
  const [keyword, setKeyword] = useState("");

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

  const filteredUsers = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return users;
    return users.filter(
      (u) => u.nick.toLowerCase().includes(kw) || u.phone.includes(kw)
    );
  }, [users, keyword]);

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
      <Input.Search
        placeholder="搜索昵称 / 手机号"
        allowClear
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        style={{ maxWidth: 320, marginBottom: 16 }}
      />
      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredUsers}
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
