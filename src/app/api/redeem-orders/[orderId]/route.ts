import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";
import { getSession } from "@/lib/session";
import { fallbackUser, getUsersByOpenid } from "@/lib/userLookup";
import { toIsoString } from "@/lib/serialize";

interface RedeemOrderDoc {
  _id: string;
  openid?: string;
  itemName?: string;
  qty?: number;
  totalPoints?: number;
  storeId?: number | string | null;
  storeName?: string | null;
  status?: string;
  createdAt?: unknown;
  completedAt?: unknown;
  completedBy?: string | null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  try {
    const { orderId } = await params;
    const db = getDb();
    const res = await db.collection("redeem_orders").doc(orderId).get();
    const doc = (res.data as RedeemOrderDoc[])[0];
    if (!doc) {
      return NextResponse.json({ error: "找不到这个核销订单" }, { status: 404 });
    }

    const userMap = await getUsersByOpenid([doc.openid]);
    const user = userMap.get(doc.openid ?? "") ?? fallbackUser(doc.openid ?? "");

    return NextResponse.json({
      order: {
        id: doc._id,
        openid: doc.openid ?? "",
        nick: user.nick,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        itemName: doc.itemName ?? "",
        qty: doc.qty ?? 0,
        totalPoints: doc.totalPoints ?? 0,
        storeName: doc.storeName ?? "",
        status: doc.status ?? "",
        createdAt: toIsoString(doc.createdAt),
        completedAt: toIsoString(doc.completedAt),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询核销订单失败" },
      { status: 500 }
    );
  }
}
