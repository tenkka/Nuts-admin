"use client";

import { Button, Form, Input } from "antd";
import AdminLayout from "@/components/AdminLayout";

export default function SettingsPage() {
  return (
    <AdminLayout>
      <h2 style={{ marginBottom: 24 }}>系统设置</h2>
      <Form layout="vertical" style={{ maxWidth: 480 }}>
        <Form.Item label="系统名称" name="siteName" initialValue="Nuts后台管理">
          <Input />
        </Form.Item>
        <Form.Item label="联系邮箱" name="email">
          <Input />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            保存
          </Button>
        </Form.Item>
      </Form>
    </AdminLayout>
  );
}
