import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";
import { getSession } from "@/lib/session";

interface BalanceLogDoc {
  type?: string;
  rechargeAmount?: number;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  try {
    const db = getDb();
    const [userCountRes, orderCountRes, rechargeLogsRes] = await Promise.all([
      db.collection("users").count(),
      db.collection("balanceLogs").count(),
      db
        .collection("balanceLogs")
        .where({ type: "recharge" })
        .limit(1000)
        .get(),
    ]);

    const totalRevenue = (rechargeLogsRes.data as BalanceLogDoc[]).reduce(
      (sum, doc) => sum + (doc.rechargeAmount ?? 0),
      0
    );

    return NextResponse.json({
      userCount: userCountRes.total ?? 0,
      orderCount: orderCountRes.total ?? 0,
      totalRevenue,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询统计数据失败" },
      { status: 500 }
    );
  }
}
