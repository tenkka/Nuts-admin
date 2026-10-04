"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Form, Input, message } from "antd";
import type { InputRef } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";

interface LoginValues {
  username: string;
  password: string;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const usernameRef = useRef<InputRef>(null);

  // autoFocus 会让浏览器在 HTML 解析阶段就原生聚焦这个输入框，早于 React
  // hydrate 完成；移动端浏览器上这会导致服务端渲染的 HTML 和客户端预期的
  // DOM 状态对不上，触发 hydration mismatch，页面直接罢工显示成没渲染的
  // 源码文本。改成 hydrate 完成后再用 ref 手动聚焦，服务端渲染的 HTML 就
  // 不会带任何和"聚焦"相关的差异。
  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const handleSubmit = async (values: LoginValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "登录失败");
      router.push("/");
      router.refresh();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0f2f5",
      }}
    >
      <Card style={{ width: 360 }}>
        <h2 style={{ textAlign: "center", marginBottom: 24 }}>Nuts后台管理</h2>
        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input ref={usernameRef} prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: "center", color: "#999", fontSize: 12 }}>
          v{process.env.NEXT_PUBLIC_APP_VERSION}
        </div>
      </Card>
    </div>
  );
}
