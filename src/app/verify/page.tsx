"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Layout } from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import RedeemVerifyPanel from "@/components/RedeemVerifyPanel";
import PointsTransactionTable from "@/components/PointsTransactionTable";

const { Header, Content } = Layout;

/**
 * scan 角色专用的独立页面，不套 AdminLayout——这类账号只能看到这一个功能，
 * 侧边栏里其它入口对它们没有意义，proxy 也会把它们的其它页面访问弹回这里。
 */
export default function VerifyPage() {
  const [loggingOut, setLoggingOut] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const router = useRouter();

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          padding: "0 16px",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>Nuts 扫码核销</span>
        <Button icon={<LogoutOutlined />} loading={loggingOut} onClick={handleLogout}>
          退出登录
        </Button>
      </Header>
      <Content style={{ margin: 16 }}>
        <Card style={{ maxWidth: 560, margin: "0 auto 16px" }}>
          <RedeemVerifyPanel onCompleted={() => setReloadTick((n) => n + 1)} />
        </Card>

        <Card title="积分兑换订单">
          {/* 只读展示，不传 onRowClick——scan 账号能看订单，
              但不能点进去改用户积分/资料，那属于完整后台的权限 */}
          <PointsTransactionTable direction="spend" reloadKey={reloadTick} />
        </Card>
      </Content>
    </Layout>
  );
}
