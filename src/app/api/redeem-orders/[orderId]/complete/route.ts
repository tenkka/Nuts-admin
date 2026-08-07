import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";
import { getSession } from "@/lib/session";

interface RedeemOrderDoc {
  _id: string;
  status?: string;
}

/**
 * 核销确认完成。直接改 redeem_orders.status，不走小程序那边的
 * completeRedeemOrder 云函数——那个云函数依赖小程序端的 WX 登录上下文，
 * 后台管理员 SDK 调不通它自己的登录校验，所以在这边直接复刻同样的效果。
 */
export async function POST(
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
    if (doc.status === "done") {
      return NextResponse.json({ error: "该订单已经核销过了" }, { status: 400 });
    }

    const now = db.serverDate({ offset: 0 });
    await db.collection("redeem_orders").doc(orderId).update({
      status: "done",
      completedAt: now,
      completedBy: session.username,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "核销失败" },
      { status: 500 }
    );
  }
}
