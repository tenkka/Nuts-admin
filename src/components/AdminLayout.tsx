"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Badge, Button, Layout, Menu, theme } from "antd";
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
  ThunderboltOutlined,
} from "@ant-design/icons";
import RedeemAlertProvider, { useRedeemAlerts } from "./RedeemAlertProvider";

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: "/", icon: <DashboardOutlined />, label: "主页" },
  { key: "/users", icon: <UserOutlined />, label: "用户管理" },
  { key: "/scan", icon: <QrcodeOutlined />, label: "扫码查询" },
  { key: "/points", icon: <GiftOutlined />, label: "积分管理" },
  { key: "/power", icon: <ThunderboltOutlined />, label: "战力管理" },
  { key: "/orders", icon: <ShoppingCartOutlined />, label: "订单管理" },
  { key: "/tables", icon: <TableOutlined />, label: "桌台管理" },
  { key: "/menu", icon: <UnorderedListOutlined />, label: "商城管理" },
  { key: "/devices", icon: <DesktopOutlined />, label: "设备管理" },
  { key: "/settings", icon: <SettingOutlined />, label: "系统设置" },
];

/**
 * Badge 默认带一圈 1px 的 colorBorderBg（白色）描边，本意是让红点和下面的头像分开，
 * 但侧边栏是深色底，那圈白边会很明显，所以这里去掉。
 */
const BADGE_ON_DARK = { indicator: { boxShadow: "none" } };

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Provider 包在外面，AdminShell 才能用 useRedeemAlerts 拿到未读数
  return (
    <RedeemAlertProvider>
      <AdminShell>{children}</AdminShell>
    </RedeemAlertProvider>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { unread } = useRedeemAlerts();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 有未读兑换时给"积分管理"挂红点：展开时显示条数，收起时只剩图标上的小红点
  const items = useMemo(() => {
    if (unread <= 0) return menuItems;
    return menuItems.map((item) =>
      item.key === "/points"
        ? {
            ...item,
            icon: collapsed ? (
              <Badge dot offset={[2, 0]} styles={BADGE_ON_DARK}>
                <GiftOutlined style={{ color: "inherit" }} />
              </Badge>
            ) : (
              item.icon
            ),
            label: (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                积分管理
                <Badge
                  count={unread}
                  size="small"
                  overflowCount={99}
                  styles={BADGE_ON_DARK}
                />
              </span>
            ),
          }
        : item
    );
  }, [unread, collapsed]);

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
          items={items}
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
