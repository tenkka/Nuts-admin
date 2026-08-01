import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";
import { pickUrl, resolveCloudFileUrls } from "@/lib/cloudFiles";
import { getSession } from "@/lib/session";
import { dedupeUsersByOpenid } from "@/lib/userLookup";
import type { NextRequest } from "next/server";

interface UserDoc {
  _id: string;
  nick?: string;
  phone?: string;
  openid?: string;
  avatarUrl?: string;
  power?: number;
  rechargeBalance?: number;
  giftBalance?: number;
  lotteryTickets?: number;
  inviteCode?: string;
  champion?: number;
  createdAt?: string;
}

interface PointAccountDoc {
  openid?: string;
  balance?: number;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const openid = request.nextUrl.searchParams.get("openid")?.trim();
  if (!openid) {
    return NextResponse.json({ error: "缺少 openid" }, { status: 400 });
  }

  try {
    const db = getDb();
    const [usersRes, pointsRes] = await Promise.all([
      db.collection("users").where({ openid }).limit(10).get(),
      db.collection("user_points").where({ openid }).limit(1).get(),
    ]);

    const docs = dedupeUsersByOpenid(usersRes.data as UserDoc[]);
    const doc = docs[0];
    if (!doc) {
      return NextResponse.json({ error: "找不到这个用户" }, { status: 404 });
    }

    const points = (pointsRes.data[0] as PointAccountDoc | undefined)?.balance ?? 0;
    const avatarUrlMap = await resolveCloudFileUrls([doc.avatarUrl]);

    const user = {
      id: doc._id,
      nick: doc.nick ?? "",
      phone: doc.phone ?? "",
      openid: doc.openid ?? "",
      avatarUrl: pickUrl(doc.avatarUrl, avatarUrlMap),
      power: doc.power ?? 0,
      points,
      rechargeBalance: doc.rechargeBalance ?? 0,
      giftBalance: doc.giftBalance ?? 0,
      lotteryTickets: doc.lotteryTickets ?? 0,
      inviteCode: doc.inviteCode ?? "",
      champion: doc.champion ?? 0,
      createdAt: doc.createdAt ?? "",
    };

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询用户失败" },
      { status: 500 }
    );
  }
}
