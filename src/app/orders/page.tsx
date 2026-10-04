"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Avatar, Button, Select, Space, Table, Tag } from "antd";
import type { TablePaginationConfig } from "antd";
import { UserOutlined } from "@ant-design/icons";
import AdminLayout from "@/components/AdminLayout";
import {
  ORDER_TYPE_COLORS,
  ORDER_TYPE_LABELS,
  orderMethodLabel,
  orderTypeLabel,
} from "@/lib/orders";

interface OrderRecord {
  id: string;
  openid: string;
  nick: string;
  avatarUrl: string;
  phone: string;
  type: string;
  method: string;
  rechargeAmount: number;
  giftAmount: number;
  totalAmount: number;
  wechatAmount: number;
  realPrice: number;
  note: string;
  storeName: string;
  outTradeNo: string;
  createdAt: string;
}

interface StoreOption {
  id: number;
  name: string;
}

interface UserOption {
  openid: string;
  nick: string;
  phone: string;
}

const PAGE_SIZE = 20;

function amount(value: number) {
  if (!value) return "-";
  const text = `¥${Math.abs(value).toFixed(2)}`;
  return (
    <span style={{ color: value < 0 ? "#cf1322" : "#3f8600" }}>
      {value < 0 ? `-${text}` : `+${text}`}
    </span>
  );
}

const columns = [
  {
    title: "用户",
    key: "user",
    render: (_: unknown, record: OrderRecord) => (
      <Space>
        <Avatar
          size="small"
          src={record.avatarUrl || undefined}
          icon={<UserOutlined />}
        />
        <span>{record.nick || record.openid.slice(0, 8) || "-"}</span>
      </Space>
    ),
  },
  {
    title: "类型",
    dataIndex: "type",
    key: "type",
    render: (type: string) => (
      <Tag color={ORDER_TYPE_COLORS[type]}>{orderTypeLabel(type)}</Tag>
    ),
  },
  {
    title: "充值余额",
    dataIndex: "rechargeAmount",
    key: "rechargeAmount",
    render: amount,
  },
  {
    title: "赠送余额",
    dataIndex: "giftAmount",
    key: "giftAmount",
    render: amount,
  },
  {
    title: "合计",
    dataIndex: "totalAmount",
    key: "totalAmount",
    render: amount,
  },
  {
    title: "支付方式",
    dataIndex: "method",
    key: "method",
    render: (method: string) => orderMethodLabel(method),
  },
  {
    title: "门店",
    dataIndex: "storeName",
    key: "storeName",
    render: (v: string) => v || "-",
  },
  {
    title: "备注",
    dataIndex: "note",
    key: "note",
    render: (note: string) => note || "-",
  },
  {
    title: "商户单号",
    dataIndex: "outTradeNo",
    key: "outTradeNo",
    render: (v: string) => v || "-",
  },
  {
    title: "时间",
    dataIndex: "createdAt",
    key: "createdAt",
    render: (v: string) => (v ? new Date(v).toLocaleString("zh-CN") : "-"),
  },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [openid, setOpenid] = useState<string | undefined>();
  const [type, setType] = useState<string | undefined>();
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({
      page: String(page - 1),
      size: String(PAGE_SIZE),
    });
    if (openid) params.set("openid", openid);
    if (type) params.set("type", type);
    if (storeId != null) params.set("storeId", String(storeId));

    // 快速连点翻页/筛选时，先发的请求可能后返回，用 stale 标记丢弃过期响应
    let stale = false;

    fetch(`/api/orders?${params}`)
      .then(async (res) => {
        const body = await res.json();
        if (stale) return;
        if (!res.ok) throw new Error(body.error || "加载订单失败");
        setOrders(body.orders);
        setTotal(body.total);
        setError(null);
      })
      .catch((err) => {
        if (!stale) setError(err.message);
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });

    return () => {
      stale = true;
    };
  }, [page, openid, type, storeId]);

  useEffect(() => {
    fetch("/api/stores")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) return;
        setStores(body.stores);
      })
      .catch(() => {
        // 门店下拉只是筛选辅助，加载失败不影响订单列表
      });
  }, []);

  useEffect(() => {
    fetch("/api/users")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) return;
        setUsers(body.users);
      })
      .catch(() => {
        // 用户下拉只是筛选辅助，加载失败不影响订单列表
      });
  }, []);

  // users 里同一 openid 可能有多条历史记录，下拉里只保留信息最全的一条
  const userOptions = useMemo(() => {
    const best = new Map<string, UserOption>();
    for (const user of users) {
      if (!user.openid) continue;
      const current = best.get(user.openid);
      if (!current || (!current.nick && user.nick)) best.set(user.openid, user);
    }
    return [...best.values()].map((u) => ({
      label: `${u.nick || "（无昵称）"}${u.phone ? ` ${u.phone}` : ""}`,
      value: u.openid,
    }));
  }, [users]);

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize: PAGE_SIZE,
    total,
    showSizeChanger: false,
    showTotal: (t) => `共 ${t} 条`,
    onChange: (next) => {
      setLoading(true);
      setPage(next);
    },
  };

  // 筛选条件变化后由上面的 effect 重新拉数据，这里只负责把表格切回加载态
  const applyFilter = (apply: () => void) => {
    setLoading(true);
    setPage(1);
    apply();
  };

  return (
    <AdminLayout>
      <h2 style={{ marginBottom: 24 }}>订单管理</h2>

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
        <Select
          showSearch
          allowClear
          placeholder="按用户筛选"
          style={{ width: 240 }}
          value={openid}
          onChange={(value) => applyFilter(() => setOpenid(value))}
          filterOption={(input, option) =>
            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
          }
          options={userOptions}
        />
        <Select
          allowClear
          placeholder="按门店筛选"
          style={{ width: 180 }}
          value={storeId}
          onChange={(value) => applyFilter(() => setStoreId(value))}
          options={stores.map((s) => ({ label: s.name, value: s.id }))}
        />
        <Select
          allowClear
          placeholder="按类型筛选"
          style={{ width: 160 }}
          value={type}
          onChange={(value) => applyFilter(() => setType(value))}
          options={Object.entries(ORDER_TYPE_LABELS).map(([value, label]) => ({
            label,
            value,
          }))}
        />
        <Button
          disabled={!openid && !type && storeId == null}
          onClick={() =>
            applyFilter(() => {
              setOpenid(undefined);
              setType(undefined);
              setStoreId(undefined);
            })
          }
        >
          重置筛选
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={orders}
        loading={loading}
        pagination={pagination}
        scroll={{ x: "max-content" }}
      />
    </AdminLayout>
  );
}
