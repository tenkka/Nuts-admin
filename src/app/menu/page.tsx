"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Form,
  Image,
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
  Upload,
} from "antd";
import { EditOutlined, PictureOutlined, PlusOutlined } from "@ant-design/icons";
import AdminLayout from "@/components/AdminLayout";
import { SNACK_CATEGORIES } from "@/lib/snackCategories";

interface SnackItem {
  id: string;
  name: string;
  category: string;
  pointsCost: number;
  isActive: boolean;
  store: number[];
  image: string;
  unit: string;
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
  unit: string;
  store: number[];
  isActive: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  小吃: "orange",
  零食: "purple",
  饮品: "blue",
  周边: "cyan",
};

function ImageUploadField({
  preview,
  uploading,
  onUpload,
}: {
  preview: string;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <Form.Item label="图片">
      <Space align="start">
        {preview && (
          <Image
            src={preview}
            alt="菜品图片预览"
            width={64}
            height={64}
            style={{ objectFit: "cover", borderRadius: 4 }}
          />
        )}
        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={(file) => {
            onUpload(file);
            return false;
          }}
        >
          <Button loading={uploading}>{preview ? "重新上传" : "上传图片"}</Button>
        </Upload>
      </Space>
    </Form.Item>
  );
}

function SnackFormFields({ stores }: { stores: Store[] }) {
  return (
    <>
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
      <Form.Item label="单位" name="unit">
        <Input placeholder="例如：份、杯、个（可自定义）" />
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
    </>
  );
}

export default function MenuPage() {
  const [items, setItems] = useState<SnackItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFileId, setImageFileId] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [form] = Form.useForm<SnackItemFormValues>();

  const [editingItem, setEditingItem] = useState<SnackItem | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editUploading, setEditUploading] = useState(false);
  const [editImageFileId, setEditImageFileId] = useState("");
  const [editImagePreview, setEditImagePreview] = useState("");
  const [editForm] = Form.useForm<SnackItemFormValues>();

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

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/snack-items/upload", {
      method: "POST",
      body: formData,
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "上传失败");
    return body as { fileID: string; url: string };
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const { fileID, url } = await uploadImage(file);
      setImageFileId(fileID);
      setImagePreview(url);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const handleEditUpload = async (file: File) => {
    setEditUploading(true);
    try {
      const { fileID, url } = await uploadImage(file);
      setEditImageFileId(fileID);
      setEditImagePreview(url);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "上传失败");
    } finally {
      setEditUploading(false);
    }
  };

  const handleAdd = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const res = await fetch("/api/snack-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, image: imageFileId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "添加失败");
      message.success("添加成功");
      setAddModalOpen(false);
      form.resetFields();
      setImageFileId("");
      setImagePreview("");
      loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "添加失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingItem) return;
    const values = await editForm.validateFields();
    setEditSubmitting(true);
    try {
      const payload: Record<string, unknown> = { ...values };
      if (editImageFileId) payload.image = editImageFileId;

      const res = await fetch(`/api/snack-items/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "保存失败");
      message.success("保存成功");
      setEditingItem(null);
      loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setEditSubmitting(false);
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
    {
      title: "图片",
      dataIndex: "image",
      key: "image",
      render: (image: string, record: SnackItem) =>
        image ? (
          <Image
            src={image}
            alt={record.name}
            width={40}
            height={40}
            style={{ objectFit: "cover" }}
          />
        ) : (
          <PictureOutlined style={{ fontSize: 20, color: "#ccc" }} />
        ),
    },
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
      title: "单位",
      dataIndex: "unit",
      key: "unit",
      render: (unit: string) => unit || "-",
    },
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
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingItem(record);
              setEditImageFileId("");
              setEditImagePreview(record.image);
              // editForm 是同一个实例，跨多次打开复用；不显式 setFieldsValue 的话
              // antd 只在表单第一次挂载时应用 initialValues，之后会一直显示上一次编辑的数据
              editForm.setFieldsValue({
                name: record.name,
                category: record.category,
                pointsCost: record.pointsCost,
                unit: record.unit,
                store: record.store,
                isActive: record.isActive,
              });
            }}
          >
            编辑
          </Button>
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
        </Space>
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
          onClick={() => setAddModalOpen(true)}
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
        open={addModalOpen}
        onCancel={() => {
          setAddModalOpen(false);
          form.resetFields();
          setImageFileId("");
          setImagePreview("");
        }}
        onOk={handleAdd}
        confirmLoading={submitting}
        okText="添加"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={{ isActive: true }}>
          <ImageUploadField
            preview={imagePreview}
            uploading={uploading}
            onUpload={handleUpload}
          />
          <SnackFormFields stores={stores} />
        </Form>
      </Modal>

      <Modal
        title="编辑菜品"
        open={!!editingItem}
        onCancel={() => setEditingItem(null)}
        onOk={handleEditSave}
        confirmLoading={editSubmitting}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
      >
        {editingItem && (
          <Form form={editForm} layout="vertical">
            <ImageUploadField
              preview={editImagePreview}
              uploading={editUploading}
              onUpload={handleEditUpload}
            />
            <SnackFormFields stores={stores} />
          </Form>
        )}
      </Modal>
    </AdminLayout>
  );
}
