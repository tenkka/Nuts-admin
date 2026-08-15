import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "nuts_admin_session";
const SESSION_DURATION = "7d";

export interface SessionPayload {
  username: string;
  role: string;
}

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("缺少 SESSION_SECRET 环境变量");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(username: string, role: string) {
  return new SignJWT({ username, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    // 老 token 是登录系统上线时签的，还没有 role 这个字段，缺省当成
    // owner（管理员）处理，不然已登录的人会被 role 检查卡在半路
    return {
      username: payload.username as string,
      role: (payload.role as string) ?? "owner",
    };
  } catch {
    return null;
  }
}

/** Reads and verifies the session cookie in a Route Handler. Returns null if absent/invalid. */
export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
