"use client";

import { useEffect, useState } from "react";
import { Alert, Card, Col, Row, Statistic } from "antd";
import { TeamOutlined, ShoppingOutlined, DollarOutlined } from "@ant-design/icons";
import AdminLayout from "@/components/AdminLayout";

interface DashboardStats {
  userCount: number;
  orderCount: number;
  totalRevenue: number;
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "加载统计数据失败");
        setStats(body);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <h2 style={{ marginBottom: 24 }}>主页</h2>
      {error && (
        <Alert
          type="error"
          title="加载失败"
          description={error}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}
      <Row gutter={16}>
        <Col span={8}>
          <Card loading={loading}>
            <Statistic
              title="用户总数"
              value={stats?.userCount ?? 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card loading={loading}>
            <Statistic
              title="订单总数"
              value={stats?.orderCount ?? 0}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card loading={loading}>
            <Statistic
              title="总收入（充值本金）"
              value={stats?.totalRevenue ?? 0}
              precision={2}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </AdminLayout>
  );
}
