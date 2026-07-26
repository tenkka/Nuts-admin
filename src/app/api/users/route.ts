import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";
import { pickUrl, resolveCloudFileUrls } from "@/lib/cloudFiles";

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

const MAX_DOCS = 1000;

export async function GET() {
  try {
    const db = getDb();
    const [usersRes, pointsRes] = await Promise.all([
      db.collection("users").limit(MAX_DOCS).get(),
      db.collection("user_points").limit(MAX_DOCS).get(),
    ]);

    const docs = usersRes.data as UserDoc[];
    const pointsMap = new Map(
      (pointsRes.data as PointAccountDoc[])
        .filter((doc) => !!doc.openid)
        .map((doc) => [doc.openid as string, doc.balance ?? 0])
    );

    const avatarUrlMap = await resolveCloudFileUrls(
      docs.map((doc) => doc.avatarUrl)
    );

    const users = docs.map((doc) => ({
      id: doc._id,
      nick: doc.nick ?? "",
      phone: doc.phone ?? "",
      openid: doc.openid ?? "",
      avatarUrl: pickUrl(doc.avatarUrl, avatarUrlMap),
      // power 是旧的战力值；积分走 user_points 集合，只读展示
      power: doc.power ?? 0,
      points: doc.openid ? pointsMap.get(doc.openid) ?? 0 : 0,
      rechargeBalance: doc.rechargeBalance ?? 0,
      giftBalance: doc.giftBalance ?? 0,
      lotteryTickets: doc.lotteryTickets ?? 0,
      inviteCode: doc.inviteCode ?? "",
      champion: doc.champion ?? 0,
      createdAt: doc.createdAt ?? "",
    }));

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询用户失败" },
      { status: 500 }
    );
  }
}
