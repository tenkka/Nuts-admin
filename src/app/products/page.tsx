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
import {
  EditOutlined,
  HolderOutlined,
  PictureOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import AdminLayout from "@/components/AdminLayout";
import { PRODUCT_CATEGORIES } from "@/lib/productCategories";

const { TextArea } = Input;

interface Store {
  id: number;
  name: string;
  city: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  bonusPoints: number;
  desc: string;
  isActive: boolean;
  image: string;
  store: number[];
}

interface ProductFormValues {
  name: string;
  category: string;
  price: number;
  bonusPoints: number;
  desc: string;
  isActive: boolean;
  store: number[];
}

const CATEGORY_COLORS: Record<string, string> = {
  套餐: "gold",
  鸡尾酒: "magenta",
  啤酒: "volcano",
  小食: "cyan",
  下午茶: "geekblue",
  甜品: "pink",
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
            alt="套餐图片预览"
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

function ProductFormFields({ stores }: { stores: Store[] }) {
  return (
    <>
      <Form.Item
        label="名称"
        name="name"
        rules={[{ required: true, message: "请输入名称" }]}
      >
        <Input placeholder="例如：138 酒水套餐" />
      </Form.Item>
      <Form.Item
        label="种类"
        name="category"
        rules={[{ required: true, message: "请选择种类" }]}
      >
        <Select
          options={PRODUCT_CATEGORIES.map((c) => ({ label: c, value: c }))}
          placeholder="选择种类"
        />
      </Form.Item>
      <Form.Item
        label="价格（元）"
        name="price"
        rules={[{ required: true, message: "请输入价格" }]}
      >
        <InputNumber style={{ width: "100%" }} min={0} placeholder="例如：138" />
      </Form.Item>
      <Form.Item
        label="赠送积分"
        name="bonusPoints"
        rules={[{ required: true, message: "请输入赠送积分" }]}
      >
        <InputNumber style={{ width: "100%" }} min={0} placeholder="例如：3500" />
      </Form.Item>
      <Form.Item label="描述" name="desc">
        <TextArea rows={2} placeholder="例如：基础饮品畅饮" />
      </Form.Item>
      <Form.Item label="是否上架" name="isActive" valuePropName="checked">
        <Switch />
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
    </>
  );
}

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFileId, setImageFileId] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [form] = Form.useForm<ProductFormValues>();

  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editUploading, setEditUploading] = useState(false);
  const [editImageFileId, setEditImageFileId] = useState("");
  const [editImagePreview, setEditImagePreview] = useState("");
  const [editForm] = Form.useForm<ProductFormValues>();

  // 正在拖的那一行，以及当前悬停到的那一行（用来画落点提示线）
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const loadData = () => {
    Promise.all([fetch("/api/products"), fetch("/api/stores")])
      .then(async ([productsRes, storesRes]) => {
        const productsBody = await productsRes.json();
        if (!productsRes.ok) throw new Error(productsBody.error || "加载套餐失败");
        const storesBody = await storesRes.json();
        if (!storesRes.ok) throw new Error(storesBody.error || "加载门店失败");
        setItems(productsBody.products);
        setStores(storesBody.stores);
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
    const res = await fetch("/api/products/upload", {
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
      const res = await fetch("/api/products", {
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

      const res = await fetch(`/api/products/${editingItem.id}`, {
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

  /** 先本地换好序再存；存失败就退回原顺序，免得界面和数据库对不上 */
  const saveOrder = async (next: Product[], previous: Product[]) => {
    setSavingOrder(true);
    try {
      const res = await fetch("/api/products/sort", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((item) => item.id) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "保存顺序失败");
      message.success("顺序已保存");
    } catch (err) {
      setItems(previous);
      message.error(err instanceof Error ? err.message : "保存顺序失败");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDropOn = (targetId: string) => {
    const from = items.findIndex((item) => item.id === dragId);
    const to = items.findIndex((item) => item.id === targetId);
    setDragId(null);
    setOverId(null);
    if (from < 0 || to < 0 || from === to) return;

    const next = items.slice();
    next.splice(to, 0, next.splice(from, 1)[0]);
    setItems(next);
    saveOrder(next, items);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "删除失败");
      message.success("删除成功");
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      message.error(err instanceof Error ? err.message : "删除失败");
    }
  };

  const storeNameMap = new Map(stores.map((s) => [s.id, s.name]));

  const columns = [
    {
      title: "排序",
      key: "drag",
      width: 60,
      render: (_: unknown, record: Product) => (
        <HolderOutlined
          draggable
          onDragStart={(e) => {
            setDragId(record.id);
            e.dataTransfer.effectAllowed = "move";
            // Firefox 不设 data 不触发拖拽
            e.dataTransfer.setData("text/plain", record.id);
          }}
          onDragEnd={() => {
            setDragId(null);
            setOverId(null);
          }}
          style={{ cursor: "grab", color: "rgba(0, 0, 0, 0.45)", fontSize: 16 }}
        />
      ),
    },
    {
      title: "图片",
      dataIndex: "image",
      key: "image",
      render: (image: string, record: Product) =>
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
    {
      title: "价格",
      dataIndex: "price",
      key: "price",
      render: (v: number) => `¥${v}`,
    },
    { title: "赠送积分", dataIndex: "bonusPoints", key: "bonusPoints" },
    {
      title: "描述",
      dataIndex: "desc",
      key: "desc",
      render: (v: string) => v || "-",
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
      title: "操作",
      key: "actions",
      render: (_: unknown, record: Product) => (
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
                price: record.price,
                bonusPoints: record.bonusPoints,
                desc: record.desc,
                isActive: record.isActive,
                store: record.store,
              });
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该套餐吗？"
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
          添加套餐
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
        loading={loading || savingOrder}
        scroll={{ x: "max-content" }}
        // 不分页，否则跨页拖不了
        pagination={false}
        rowClassName={(record) => {
          if (dragId === record.id) return "drag-row-dragging";
          if (!dragId || overId !== record.id) return "";
          const dragIndex = items.findIndex((item) => item.id === dragId);
          const overIndex = items.findIndex((item) => item.id === record.id);
          // 从上往下拖，落点在目标下方；反之在上方
          return dragIndex < overIndex ? "drag-row-after" : "drag-row-before";
        }}
        onRow={(record) => ({
          onDragOver: (e) => {
            if (!dragId || dragId === record.id) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setOverId(record.id);
          },
          onDragLeave: () =>
            setOverId((id) => (id === record.id ? null : id)),
          onDrop: (e) => {
            e.preventDefault();
            handleDropOn(record.id);
          },
        })}
      />

      <Modal
        title="添加套餐"
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
          <ProductFormFields stores={stores} />
        </Form>
      </Modal>

      <Modal
        title="编辑套餐"
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
            <ProductFormFields stores={stores} />
          </Form>
        )}
      </Modal>
    </AdminLayout>
  );
}
