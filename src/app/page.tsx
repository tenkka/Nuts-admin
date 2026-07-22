"use client";

import { Card, Col, Row, Statistic } from "antd";
import {
  ArrowUpOutlined,
  TeamOutlined,
  ShoppingOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import AdminLayout from "@/components/AdminLayout";

export default function Home() {
  return (
    <AdminLayout>
      <h2 style={{ marginBottom: 24 }}>主页</h2>
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title="用户总数"
              value={1128}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="订单总数"
              value={356}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="总收入"
              value={89320}
              precision={2}
              prefix={<DollarOutlined />}
              suffix={<ArrowUpOutlined style={{ color: "#3f8600" }} />}
            />
          </Card>
        </Col>
      </Row>
    </AdminLayout>
  );
}
