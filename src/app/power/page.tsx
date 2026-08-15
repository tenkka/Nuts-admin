"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Avatar, Card, Col, Input, Row, Select, Statistic, Table } from "antd";
import { UserOutlined } from "@ant-design/icons";
import AdminLayout from "@/components/AdminLayout";
import GameStatsDetailModal, {
  GameRanking,
  Store,
} from "@/components/GameStatsDetailModal";

const ALL_STORES = "all";

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
    title: "战力",
    dataIndex: "totalPower",
    key: "totalPower",
    sorter: (a: GameRanking, b: GameRanking) => a.totalPower - b.totalPower,
    defaultSortOrder: "descend" as const,
  },
  { title: "冠军次数", dataIndex: "championCount", key: "championCount" },
  {
    title: "更新时间",
    dataIndex: "updatedAt",
    key: "updatedAt",
    render: (v: string) => (v ? new Date(v).toLocaleString("zh-CN") : "-"),
  },
];

export default function PowerPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeFilter, setStoreFilter] = useState<string>(ALL_STORES);
  const [rankings, setRankings] = useState<GameRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<GameRanking | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetch("/api/stores")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "加载门店失败");
        setStores(body.stores);
      })
      .catch((err) => setError(err.message));
  }, []);

  const loadRankings = (storeValue: string) => {
    const qs = storeValue === ALL_STORES ? "" : `?storeId=${storeValue}`;
    return fetch(`/api/game-stats${qs}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "加载战力排行失败");
        setRankings(body.rankings);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handleStoreChange = (value: string) => {
    setStoreFilter(value);
    setLoading(true);
    loadRankings(value);
  };

  useEffect(() => {
    loadRankings(ALL_STORES);
  }, []);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return rankings;
    return rankings.filter(
      (r) =>
        r.nick.toLowerCase().includes(kw) ||
        r.phone.includes(kw) ||
        r.openid.toLowerCase().includes(kw)
    );
  }, [rankings, keyword]);

  const summary = useMemo(
    () => ({
      participants: rankings.filter((r) => r.totalPower > 0 || r.championCount > 0)
        .length,
      totalPower: rankings.reduce((sum, r) => sum + r.totalPower, 0),
      totalChampions: rankings.reduce((sum, r) => sum + r.championCount, 0),
    }),
    [rankings]
  );

  const defaultStoreId =
    storeFilter === ALL_STORES ? null : Number(storeFilter);

  return (
    <AdminLayout>
      <h2 style={{ marginBottom: 24 }}>战力管理</h2>

      {error && (
        <Alert
          type="error"
          title="加载失败"
          description={error}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="参与人数" value={summary.participants} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="战力总和" value={summary.totalPower} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="冠军总次数" value={summary.totalChampions} />
          </Card>
        </Col>
      </Row>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Select
          style={{ width: 200 }}
          value={storeFilter}
          onChange={handleStoreChange}
          options={[
            { label: "全部门店（累计）", value: ALL_STORES },
            ...stores.map((s) => ({ label: s.name, value: String(s.id) })),
          ]}
        />
        <Input.Search
          placeholder="搜索昵称 / 手机号 / openid"
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

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

      <GameStatsDetailModal
        record={selected}
        stores={stores}
        defaultStoreId={defaultStoreId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdjusted={() => loadRankings(storeFilter)}
      />
    </AdminLayout>
  );
}
