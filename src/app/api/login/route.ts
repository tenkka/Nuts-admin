import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";

function safeCompare(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json(
        { error: "请输入用户名和密码" },
        { status: 400 }
      );
    }

    const db = getDb();
    const { data } = await db
      .collection("web_login")
      .where({ username })
      .limit(1)
      .get();

    const account = data[0] as
      | { username: string; password: string; role?: string }
      | undefined;

    if (!account || !safeCompare(String(account.password), String(password))) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const token = await createSessionToken(account.username, account.role || "owner");
    // Secure cookie 只在真正的 HTTPS 请求下才能被浏览器保留；
    // 直接看 NODE_ENV 在纯 HTTP 部署（如内网直接用 IP 访问）下会导致 cookie 被浏览器静默丢弃，登录后立刻被弹回登录页。
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const isHttps = forwardedProto
      ? forwardedProto === "https"
      : new URL(request.url).protocol === "https:";
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "登录失败" },
      { status: 500 }
    );
  }
}
