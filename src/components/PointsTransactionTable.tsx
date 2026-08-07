"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Avatar, Button, Input, Space, Table, Tag } from "antd";
import { ReloadOutlined, UserOutlined } from "@ant-design/icons";
import { pointsSourceLabel } from "@/lib/points";

export interface PointsTransaction {
  id: string;
  openid: string;
  nick: string;
  phone: string;
  avatarUrl: string;
  delta: number;
  type: string;
  source: string;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  storeName: string;
  createdAt: string;
}

/** 接口单次上限就是 100，"加载更多"按这个粒度往后翻 */
const PAGE_SIZE = 100;

/**
 * 全站积分流水表。direction=earn 只有增加，direction=spend 只有兑换/扣除，
 * 两个 tab 各挂一个实例，互不影响。
 */
export default function PointsTransactionTable({
  direction,
  /** 变一下就重新从第一页拉，用于新兑换到达时刷新 */
  reloadKey = 0,
  onRowClick,
  toolbarExtra,
}: {
  direction: "earn" | "spend";
  reloadKey?: number;
  onRowClick?: (openid: string) => void;
  /** 搜索框旁边的额外按钮，比如兑换 tab 的"扫码核销" */
  toolbarExtra?: React.ReactNode;
}) {
  const [rows, setRows] = useState<PointsTransaction[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");

  // 状态全部在 then/catch 回调里更新：loading 由点击方先置 true，
  // 挂载时的自动加载不同步 setState，免得在 effect 里触发级联渲染
  const loadPage = useCallback(
    (nextPage: number, append: boolean) =>
      fetch(
        `/api/points/transactions?direction=${direction}&page=${nextPage}&size=${PAGE_SIZE}`,
        { cache: "no-store" }
      )
        .then(async (res) => {
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || "加载积分流水失败");
          return body as { transactions: PointsTransaction[]; hasMore: boolean };
        })
        .then((body) => {
          const list = body.transactions ?? [];
          setRows((prev) => (append ? [...prev, ...list] : list));
          setPage(nextPage);
          setHasMore(!!body.hasMore);
          setError(null);
        })
        .catch((err) =>
          setError(err instanceof Error ? err.message : "加载积分流水失败")
        )
        .finally(() => setLoading(false)),
    [direction]
  );

  useEffect(() => {
    loadPage(0, false);
  }, [loadPage, reloadKey]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return rows;
    return rows.filter(
      (r) =>
        r.nick.toLowerCase().includes(kw) ||
        r.phone.includes(kw) ||
        r.description.toLowerCase().includes(kw) ||
        r.openid.toLowerCase().includes(kw)
    );
  }, [rows, keyword]);

  const isEarn = direction === "earn";

  const columns = useMemo(
    () => [
      {
        title: "用户",
        dataIndex: "nick",
        key: "nick",
        render: (nick: string, row: PointsTransaction) => (
          <Space size={8}>
            <Avatar
              size="small"
              src={row.avatarUrl || undefined}
              icon={<UserOutlined />}
            />
            <span>{nick || "（未设置昵称）"}</span>
          </Space>
        ),
      },
      {
        title: isEarn ? "获得积分" : "消耗积分",
        dataIndex: "delta",
        key: "delta",
        sorter: (a: PointsTransaction, b: PointsTransaction) =>
          Math.abs(a.delta) - Math.abs(b.delta),
        render: (delta: number) => (
          <span style={{ fontWeight: 600, color: isEarn ? "#3f8600" : "#cf1322" }}>
            {isEarn ? `+${delta}` : delta}
          </span>
        ),
      },
      {
        title: "来源",
        dataIndex: "source",
        key: "source",
        render: (source: string) => <Tag>{pointsSourceLabel(source)}</Tag>,
      },
      {
        title: "说明",
        dataIndex: "description",
        key: "description",
        render: (v: string) => v || "-",
      },
      ...(isEarn
        ? []
        : [
            {
              title: "门店",
              dataIndex: "storeName",
              key: "storeName",
              render: (v: string) => v || "-",
            },
          ]),
      {
        title: "余额变化",
        key: "balance",
        render: (_: unknown, row: PointsTransaction) =>
          `${row.balanceBefore} → ${row.balanceAfter}`,
      },
      {
        title: "时间",
        dataIndex: "createdAt",
        key: "createdAt",
        render: (v: string) => (v ? new Date(v).toLocaleString("zh-CN") : "-"),
      },
    ],
    [isEarn]
  );

  return (
    <div>
      {error && (
        <Alert
          type="error"
          title="加载失败"
          description={error}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="搜索昵称 / 手机号 / 说明 / openid"
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 280 }}
        />
        <Button
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => {
            setLoading(true);
            loadPage(0, false);
          }}
        >
          刷新
        </Button>
        {toolbarExtra}
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={loading}
        scroll={{ x: "max-content" }}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        onRow={(record) => ({
          onClick: () => onRowClick?.(record.openid),
          style: onRowClick ? { cursor: "pointer" } : undefined,
        })}
      />

      {hasMore && (
        <Button
          block
          loading={loading}
          onClick={() => {
            setLoading(true);
            loadPage(page + 1, true);
          }}
          style={{ marginTop: 12 }}
        >
          加载更多
        </Button>
      )}
    </div>
  );
}
