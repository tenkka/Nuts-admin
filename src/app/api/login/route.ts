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

    const account = data[0] as { username: string; password: string } | undefined;

    if (!account || !safeCompare(String(account.password), String(password))) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const token = await createSessionToken(account.username);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
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
