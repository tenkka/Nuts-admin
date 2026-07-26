"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  message,
} from "antd";
import { DownOutlined, PlusOutlined, UserOutlined } from "@ant-design/icons";
import AdminLayout from "@/components/AdminLayout";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  BOOKING_TYPE_LABELS,
  type BookingStatus,
} from "@/lib/bookings";

interface Booking {
  id: string;
  openid: string;
  nick: string;
  avatarUrl: string;
  type: string;
  arrivalTime: string;
  queueNo: number;
  status: string;
  createdAt: string;
}

interface TableRecord {
  id: string;
  name: string;
  storeId: number | null;
  storeName: string;
  maxplayer: number;
  sort: number;
  isOpen: boolean;
  seatCount: number;
  queueCount: number;
  isFull: boolean;
  bookings: Booking[];
}

interface Store {
  id: number;
  name: string;
}

interface TableFormValues {
  name: string;
  storeId: number;
  maxplayer: number;
  sort: number;
  isOpen: boolean;
}

const ORPHAN_TAB_KEY = "__orphan__";

export default function TablesPage() {
  const [tables, setTables] = useState<TableRecord[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TableRecord | null>(null);
  const [activeStore, setActiveStore] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<TableFormValues>();

  // 不在这里置 loading=true：首次加载由初始状态覆盖，
  // 后续都是操作成功后的静默刷新（已有 message 提示）
  const loadTables = useCallback(
    () =>
      fetch("/api/tables")
        .then(async (res) => {
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || "加载桌台失败");
          setTables(body.tables);
          setStores(body.stores);
          setError(null);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  // 门店标签页。activeStore 为空时落到第一个标签，避免在 effect 里补默认值
  const knownStoreIds = new Set(stores.map((s) => s.id));
  const orphanTables = tables.filter(
    (t) => t.storeId == null || !knownStoreIds.has(t.storeId)
  );
  const tabItems = [
    ...stores.map((store) => ({
      key: String(store.id),
      label: `${store.name}（${
        tables.filter((t) => t.storeId === store.id).length
      }）`,
    })),
    ...(orphanTables.length > 0
      ? [{ key: ORPHAN_TAB_KEY, label: `未归属门店（${orphanTables.length}）` }]
      : []),
  ];
  // 选中的标签可能已经消失（比如最后一张未归属桌台被改到了正式门店），
  // 这时回退到第一个标签，避免出现无选中态的空列表
  const activeKey = tabItems.some((tab) => tab.key === activeStore)
    ? (activeStore as string)
    : tabItems[0]?.key ?? "";
  const visibleTables =
    activeKey === ORPHAN_TAB_KEY
      ? orphanTables
      : tables.filter((t) => String(t.storeId) === activeKey);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (record: TableRecord) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const res = await fetch(
        editing ? `/api/tables/${editing.id}` : "/api/tables",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "保存失败");
      message.success(editing ? "保存成功" : "添加成功");
      setModalOpen(false);
      form.resetFields();
      // 桌台可能被存到了当前标签页之外的门店，跟过去，免得看起来像没保存成功
      if (typeof values.storeId === "number") {
        setActiveStore(String(values.storeId));
      }
      loadTables();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/tables/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "删除失败");
      message.success("删除成功");
      setTables((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      message.error(err instanceof Error ? err.message : "删除失败");
    }
  };

  const handleBookingStatus = async (bookingId: string, status: BookingStatus) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "更新失败");
      message.success("已更新预约状态");
      loadTables();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "更新失败");
    }
  };

  const columns = [
    { title: "桌台名称", dataIndex: "name", key: "name" },
    { title: "人数上限", dataIndex: "maxplayer", key: "maxplayer" },
    {
      title: "占位情况",
      key: "seat",
      render: (_: unknown, record: TableRecord) => (
        <Space size={4}>
          <Tag color={record.isFull ? "red" : "green"}>
            已订 {record.seatCount}/{record.maxplayer}
          </Tag>
          {record.queueCount > 0 && <Tag color="gold">排队 {record.queueCount}</Tag>}
        </Space>
      ),
    },
    {
      title: "预约用户",
      key: "guests",
      render: (_: unknown, record: TableRecord) => {
        if (record.bookings.length === 0) {
          return <span style={{ color: "rgba(0,0,0,0.45)" }}>暂无</span>;
        }
        return (
          <Space size={4} wrap style={{ maxWidth: 320 }}>
            {record.bookings.map((booking) => (
              <Tooltip
                key={booking.id}
                title={`${BOOKING_TYPE_LABELS[booking.type] ?? booking.type} · ${
                  BOOKING_STATUS_LABELS[booking.status as BookingStatus] ??
                  booking.status
                }${booking.arrivalTime ? ` · ${booking.arrivalTime} 到店` : ""}`}
              >
                <Tag
                  color={booking.type === "queue" ? "gold" : "blue"}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <Avatar
                    size={18}
                    src={booking.avatarUrl || undefined}
                    icon={<UserOutlined />}
                  />
                  {booking.nick || booking.openid.slice(0, 6)}
                </Tag>
              </Tooltip>
            ))}
          </Space>
        );
      },
    },
    {
      title: "状态",
      dataIndex: "isOpen",
      key: "isOpen",
      render: (isOpen: boolean) => (
        <Tag color={isOpen ? "green" : "default"}>{isOpen ? "开放" : "关闭"}</Tag>
      ),
    },
    { title: "排序", dataIndex: "sort", key: "sort" },
    {
      title: "操作",
      key: "actions",
      render: (_: unknown, record: TableRecord) => (
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除该桌台吗？"
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button danger size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const bookingColumns = [
    {
      title: "用户",
      key: "user",
      render: (_: unknown, booking: Booking) => (
        <Space>
          <Avatar
            size="small"
            src={booking.avatarUrl || undefined}
            icon={<UserOutlined />}
          />
          <span>{booking.nick || booking.openid.slice(0, 8) || "-"}</span>
        </Space>
      ),
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      render: (type: string) => BOOKING_TYPE_LABELS[type] ?? type,
    },
    {
      title: "排队号",
      dataIndex: "queueNo",
      key: "queueNo",
      render: (no: number) => no || "-",
    },
    {
      title: "到店时间",
      dataIndex: "arrivalTime",
      key: "arrivalTime",
      render: (v: string) => v || "-",
    },
    {
      title: "提交时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => (v ? new Date(v).toLocaleString("zh-CN") : "-"),
    },
    {
      title: "状态",
      key: "status",
      render: (_: unknown, booking: Booking) => (
        <Select
          size="small"
          style={{ width: 110 }}
          value={booking.status as BookingStatus}
          onChange={(status: BookingStatus) =>
            handleBookingStatus(booking.id, status)
          }
          options={BOOKING_STATUSES.map((status) => ({
            label: BOOKING_STATUS_LABELS[status],
            value: status,
          }))}
        />
      ),
    },
  ];

  return (
    <AdminLayout>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h2>桌台管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          添加桌台
        </Button>
      </div>

      {error && (
        <Alert
          type="error"
          title="加载失败"
          description={error}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      {tabItems.length > 0 && (
        <Tabs
          activeKey={activeKey}
          onChange={setActiveStore}
          items={tabItems}
          style={{ marginBottom: 8 }}
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={visibleTables}
        loading={loading}
        scroll={{ x: "max-content" }}
        expandable={{
          expandedRowRender: (record) =>
            record.bookings.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无进行中的预约"
              />
            ) : (
              <Table
                rowKey="id"
                size="small"
                columns={bookingColumns}
                dataSource={record.bookings}
                pagination={false}
              />
            ),
          // 没有预约的桌台不显示展开箭头，避免点开是空的
          rowExpandable: (record) => record.bookings.length > 0,
          expandIcon: ({ expanded, onExpand, record }) =>
            record.bookings.length === 0 ? null : (
              <DownOutlined
                rotate={expanded ? 180 : 0}
                style={{
                  cursor: "pointer",
                  color: "rgba(0,0,0,0.45)",
                  transition: "transform 0.2s",
                }}
                onClick={(e) => onExpand(record, e)}
              />
            ),
        }}
      />

      <Modal
        title={editing ? "编辑桌台" : "添加桌台"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        okText={editing ? "保存" : "添加"}
        cancelText="取消"
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={
            editing
              ? {
                  name: editing.name,
                  storeId: editing.storeId ?? undefined,
                  maxplayer: editing.maxplayer,
                  sort: editing.sort,
                  isOpen: editing.isOpen,
                }
              : {
                  isOpen: true,
                  maxplayer: 6,
                  // 默认落在当前标签页的门店，排序接在该店最后一张桌之后
                  storeId: activeKey === ORPHAN_TAB_KEY ? undefined : Number(activeKey),
                  sort:
                    visibleTables.reduce((max, t) => Math.max(max, t.sort), 0) + 1,
                }
          }
        >
          <Form.Item
            label="桌台名称"
            name="name"
            rules={[{ required: true, message: "请输入桌台名称" }]}
          >
            <Input placeholder="例如：1号桌" />
          </Form.Item>
          <Form.Item
            label="门店"
            name="storeId"
            rules={[{ required: true, message: "请选择门店" }]}
          >
            <Select
              placeholder="选择门店"
              options={stores.map((s) => ({ label: s.name, value: s.id }))}
            />
          </Form.Item>
          <Form.Item
            label="人数上限"
            name="maxplayer"
            rules={[{ required: true, message: "请输入人数上限" }]}
          >
            <InputNumber style={{ width: "100%" }} min={1} precision={0} />
          </Form.Item>
          <Form.Item label="排序" name="sort">
            <InputNumber style={{ width: "100%" }} precision={0} />
          </Form.Item>
          <Form.Item label="是否开放" name="isOpen" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </AdminLayout>
  );
}
