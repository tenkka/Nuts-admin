"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Input,
  Row,
  Statistic,
  Table,
  Tabs,
} from "antd";
import { QrcodeOutlined, UserOutlined } from "@ant-design/icons";
import AdminLayout from "@/components/AdminLayout";
import PointsDetailModal, { PointAccount } from "@/components/PointsDetailModal";
import PointsTransactionTable from "@/components/PointsTransactionTable";
import RedeemVerifyModal from "@/components/RedeemVerifyModal";
import { useRedeemAlerts } from "@/components/RedeemAlertProvider";

const columns = [
  {
    title: "头像",
    dataIndex: "avatarUrl",
    key: "avatarUrl",
    render: (url: string) => (
      <Avatar src={url || undefined} icon={<UserOutlined />} />
    ),
  },
  { title: "昵称", dataIndex: "nick", key: "nick" },
  { title: "手机号", dataIndex: "phone", key: "phone" },
  {
    title: "当前积分",
    dataIndex: "balance",
    key: "balance",
    sorter: (a: PointAccount, b: PointAccount) => a.balance - b.balance,
    defaultSortOrder: "descend" as const,
  },
  { title: "累计获得", dataIndex: "totalEarned", key: "totalEarned" },
  { title: "累计消耗", dataIndex: "totalSpent", key: "totalSpent" },
  {
    title: "更新时间",
    dataIndex: "updatedAt",
    key: "updatedAt",
    render: (v: string) => (v ? new Date(v).toLocaleString("zh-CN") : "-"),
  },
];

export default function PointsPage() {
  // 内容拆成子组件，才能落在 AdminLayout 里的 RedeemAlertProvider 之下
  return (
    <AdminLayout>
      <PointsContent />
    </AdminLayout>
  );
}

function PointsContent() {
  const [accounts, setAccounts] = useState<PointAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<PointAccount | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("accounts");
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [manualReloadTick, setManualReloadTick] = useState(0);
  const { unread, markAllRead, redemptions } = useRedeemAlerts();

  useEffect(() => {
    fetch("/api/points")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "加载积分账户失败");
        setAccounts(body.accounts);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // 人已经停在兑换 tab 上了，新兑换进来直接算已读，红点不用再闪
  useEffect(() => {
    if (activeTab === "redeem" && unread > 0) markAllRead();
  }, [activeTab, unread, markAllRead]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return accounts;
    return accounts.filter(
      (a) =>
        a.nick.toLowerCase().includes(kw) ||
        a.phone.includes(kw) ||
        a.openid.toLowerCase().includes(kw)
    );
  }, [accounts, keyword]);

  const summary = useMemo(
    () => ({
      holders: accounts.filter((a) => a.balance > 0).length,
      totalBalance: accounts.reduce((sum, a) => sum + a.balance, 0),
      totalSpent: accounts.reduce((sum, a) => sum + a.totalSpent, 0),
    }),
    [accounts]
  );

  const handleAdjusted = (openid: string, balanceAfter: number, delta: number) => {
    const applyDelta = (account: PointAccount): PointAccount => ({
      ...account,
      hasAccount: true,
      balance: balanceAfter,
      totalEarned: delta > 0 ? account.totalEarned + delta : account.totalEarned,
      totalSpent: delta < 0 ? account.totalSpent - delta : account.totalSpent,
      updatedAt: new Date().toISOString(),
    });

    setAccounts((prev) =>
      prev.map((a) => (a.openid === openid ? applyDelta(a) : a))
    );
    setSelected((prev) => (prev && prev.openid === openid ? applyDelta(prev) : prev));
  };

  const openAccount = useCallback(
    (openid: string) => {
      const account = accounts.find((a) => a.openid === openid);
      if (!account) return;
      setSelected(account);
      setModalOpen(true);
    },
    [accounts]
  );

  // 最新兑换的时间戳变了，或者手动核销完成一次，都要让兑换表重新拉第一页
  const redeemReloadKey =
    (redemptions.length ? Date.parse(redemptions[0].createdAt) || 0 : 0) +
    manualReloadTick;

  const tabItems = [
    {
      key: "accounts",
      label: "积分账户",
      children: (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic title="持有积分用户数" value={summary.holders} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic title="流通积分总量" value={summary.totalBalance} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic title="累计消耗积分" value={summary.totalSpent} />
              </Card>
            </Col>
          </Row>

          <Input.Search
            placeholder="搜索昵称 / 手机号 / openid"
            allowClear
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ maxWidth: 320, marginBottom: 16 }}
          />

          <Table
            rowKey="openid"
            columns={columns}
            dataSource={filtered}
            loading={loading}
            scroll={{ x: "max-content" }}
            onRow={(record) => ({
              onClick: () => {
                setSelected(record);
                setModalOpen(true);
              },
              style: { cursor: "pointer" },
            })}
          />
        </>
      ),
    },
    {
      key: "earn",
      label: "积分增加",
      children: (
        <PointsTransactionTable direction="earn" onRowClick={openAccount} />
      ),
    },
    {
      key: "redeem",
      label: (
        <Badge count={unread} size="small" offset={[10, -2]} overflowCount={99}>
          积分兑换
        </Badge>
      ),
      children: (
        <PointsTransactionTable
          direction="spend"
          reloadKey={redeemReloadKey}
          onRowClick={openAccount}
          toolbarExtra={
            <Button
              icon={<QrcodeOutlined />}
              onClick={() => setRedeemModalOpen(true)}
            >
              扫码核销
            </Button>
          }
        />
      ),
    },
  ];

  return (
    <>
      <h2 style={{ marginBottom: 24 }}>积分管理</h2>

      {error && (
        <Alert
          type="error"
          title="加载失败"
          description={error}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      <PointsDetailModal
        account={selected}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdjusted={handleAdjusted}
      />

      <RedeemVerifyModal
        open={redeemModalOpen}
        onClose={() => setRedeemModalOpen(false)}
        onCompleted={() => setManualReloadTick((n) => n + 1)}
      />
    </>
  );
}
