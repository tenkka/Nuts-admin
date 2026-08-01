"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button, Layout, Menu, theme } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  UnorderedListOutlined,
  SettingOutlined,
  GiftOutlined,
  ShoppingCartOutlined,
  TableOutlined,
  LogoutOutlined,
  DesktopOutlined,
  QrcodeOutlined,
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: "/", icon: <DashboardOutlined />, label: "主页" },
  { key: "/users", icon: <UserOutlined />, label: "用户管理" },
  { key: "/scan", icon: <QrcodeOutlined />, label: "扫码查询" },
  { key: "/points", icon: <GiftOutlined />, label: "积分管理" },
  { key: "/orders", icon: <ShoppingCartOutlined />, label: "订单管理" },
  { key: "/tables", icon: <TableOutlined />, label: "桌台管理" },
  { key: "/menu", icon: <UnorderedListOutlined />, label: "菜单管理" },
  { key: "/devices", icon: <DesktopOutlined />, label: "设备管理" },
  { key: "/settings", icon: <SettingOutlined />, label: "系统设置" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div
          style={{
            height: 32,
            margin: 16,
            color: "#fff",
            fontWeight: 600,
            fontSize: collapsed ? 16 : 18,
            textAlign: "center",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {collapsed ? "N" : "Nuts后台"}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: "0 16px",
            background: colorBgContainer,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          Nuts后台管理
          <Button
            icon={<LogoutOutlined />}
            loading={loggingOut}
            onClick={handleLogout}
          >
            退出登录
          </Button>
        </Header>
        <Content style={{ margin: "16px" }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
