import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/api/login"];

// scan 角色（前台核销专用账号）登录后只能看这几个路径，
// 其它一律弹回 /verify，不让它们碰到完整后台的任何页面/接口
const SCAN_ROLE_ALLOWED_PATHS = [
  "/verify",
  "/api/redeem-orders",
  "/api/points/transactions",
  "/api/logout",
];

function matchesPath(pathname: string, allowed: string[]) {
  return allowed.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (matchesPath(pathname, PUBLIC_PATHS)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (session.role === "scan" && !matchesPath(pathname, SCAN_ROLE_ALLOWED_PATHS)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/verify", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // 排除整个 _next/* （包括开发模式下的 webpack-hmr WebSocket），
  // 否则 proxy 会把 HMR 的握手请求当成普通导航重定向到 /login，
  // 把 HMR 连接打断，dev 模式下页面会一直报 WebSocket 错误。
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
