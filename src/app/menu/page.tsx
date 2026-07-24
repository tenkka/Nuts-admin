"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import AdminLayout from "@/components/AdminLayout";
import { SNACK_CATEGORIES } from "@/lib/snackCategories";

interface SnackItem {
  id: string;
  name: string;
  category: string;
  pointsCost: number;
  isActive: boolean;
  store: number[];
}

interface Store {
  id: number;
  name: string;
  city: string;
}

interface SnackItemFormValues {
  name: string;
  category: string;
  pointsCost: number;
  store: number[];
  isActive: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  小吃: "orange",
  零食: "purple",
  饮品: "blue",
};

export default function MenuPage() {
  const [items, setItems] = useState<SnackItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<SnackItemFormValues>();

  const storeNameMap = new Map(stores.map((s) => [s.id, s.name]));

  const loadData = () => {
    Promise.all([
      fetch("/api/snack-items").then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "加载菜品失败");
        return body.items as SnackItem[];
      }),
      fetch("/api/stores").then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "加载门店失败");
        return body.stores as Store[];
      }),
    ])
      .then(([snackItems, storeList]) => {
        setItems(snackItems);
        setStores(storeList);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const res = await fetch("/api/snack-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "添加失败");
      message.success("添加成功");
      setModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "添加失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/snack-items/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "删除失败");
      message.success("删除成功");
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      message.error(err instanceof Error ? err.message : "删除失败");
    }
  };

  const columns = [
    { title: "名称", dataIndex: "name", key: "name" },
    {
      title: "种类",
      dataIndex: "category",
      key: "category",
      render: (category: string) => (
        <Tag color={CATEGORY_COLORS[category]}>{category}</Tag>
      ),
    },
    { title: "积分价格", dataIndex: "pointsCost", key: "pointsCost" },
    {
      title: "门店",
      dataIndex: "store",
      key: "store",
      render: (store: number[]) => (
        <Space size={4} wrap>
          {store.map((id) => (
            <Tag key={id}>{storeNameMap.get(id) ?? `#${id}`}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "状态",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean) => (
        <Tag color={isActive ? "green" : "default"}>
          {isActive ? "上架" : "下架"}
        </Tag>
      ),
    },
    {
      title: "操作",
      key: "actions",
      render: (_: unknown, record: SnackItem) => (
        <Popconfirm
          title="确定删除该菜品吗？"
          okText="删除"
          okButtonProps={{ danger: true }}
          cancelText="取消"
          onConfirm={() => handleDelete(record.id)}
        >
          <Button danger size="small">
            删除
          </Button>
        </Popconfirm>
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
        <h2>菜单管理</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
        >
          添加菜品
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

      <Table
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={loading}
        scroll={{ x: "max-content" }}
      />

      <Modal
        title="添加菜品"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleAdd}
        confirmLoading={submitting}
        okText="添加"
        cancelText="取消"
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ isActive: true }}
        >
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: "请输入菜品名称" }]}
          >
            <Input placeholder="例如：薯条" />
          </Form.Item>
          <Form.Item
            label="种类"
            name="category"
            rules={[{ required: true, message: "请选择种类" }]}
          >
            <Select
              options={SNACK_CATEGORIES.map((c) => ({ label: c, value: c }))}
              placeholder="选择种类"
            />
          </Form.Item>
          <Form.Item
            label="积分价格"
            name="pointsCost"
            rules={[{ required: true, message: "请输入积分价格" }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} placeholder="例如：3000" />
          </Form.Item>
          <Form.Item
            label="门店"
            name="store"
            rules={[{ required: true, message: "请至少选择一个门店" }]}
          >
            <Select
              mode="multiple"
              placeholder="选择门店"
              options={stores.map((s) => ({
                label: `${s.name}${s.city ? `（${s.city}）` : ""}`,
                value: s.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="是否上架" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </AdminLayout>
  );
}
