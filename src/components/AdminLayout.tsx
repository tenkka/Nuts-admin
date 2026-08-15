"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Badge, Button, Drawer, Grid, Layout, Menu, theme } from "antd";
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
  ShopOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import RedeemAlertProvider, { useRedeemAlerts } from "./RedeemAlertProvider";

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const menuItems = [
  { key: "/", icon: <DashboardOutlined />, label: "主页" },
  { key: "/users", icon: <UserOutlined />, label: "用户管理" },
  { key: "/scan", icon: <QrcodeOutlined />, label: "扫码查询" },
  { key: "/points", icon: <GiftOutlined />, label: "积分管理" },
  { key: "/power", icon: <ThunderboltOutlined />, label: "战力管理" },
  { key: "/orders", icon: <ShoppingCartOutlined />, label: "订单管理" },
  { key: "/tables", icon: <TableOutlined />, label: "桌台管理" },
  { key: "/menu", icon: <UnorderedListOutlined />, label: "商城管理" },
  { key: "/products", icon: <ShopOutlined />, label: "菜单管理" },
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { unread } = useRedeemAlerts();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  // md 断点（768px）以下按手机布局处理：侧边栏收起来，靠汉堡按钮弹抽屉，
  // 不然固定侧边栏在窄屏上会把内容区挤成一条，文字全竖排
  const screens = useBreakpoint();
  const isMobile = screens.md === false;

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

  const navMenu = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[pathname]}
      items={items}
      onClick={({ key }) => {
        router.push(key);
        setMobileNavOpen(false);
      }}
    />
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {isMobile ? (
        <Drawer
          placement="left"
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          closable={false}
          size={220}
          styles={{ body: { padding: 0, background: "#001529" } }}
        >
          <div
            style={{
              height: 32,
              margin: 16,
              color: "#fff",
              fontWeight: 600,
              fontSize: 18,
              textAlign: "center",
            }}
          >
            Nuts后台
          </div>
          {navMenu}
        </Drawer>
      ) : (
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
          {navMenu}
        </Sider>
      )}
      <Layout>
        <Header
          style={{
            padding: isMobile ? "0 12px" : "0 16px",
            background: colorBgContainer,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            {isMobile && (
              <Button
                icon={<MenuOutlined />}
                onClick={() => setMobileNavOpen(true)}
              />
            )}
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {isMobile ? "Nuts后台" : "Nuts后台管理"}
            </span>
          </div>
          <Button
            icon={<LogoutOutlined />}
            loading={loggingOut}
            onClick={handleLogout}
          >
            {isMobile ? "" : "退出登录"}
          </Button>
        </Header>
        <Content style={{ margin: isMobile ? "8px" : "16px" }}>
          <div
            style={{
              padding: isMobile ? 12 : 24,
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
