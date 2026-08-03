import { NextResponse } from "next/server";
import { getDb, getOrEmpty } from "@/lib/cloudbase";
import { isRedeemAlert } from "@/lib/points";
import { toIsoString } from "@/lib/serialize";

/**
 * 只取最近这些条来算红点。红点最多显示 99+，前端拿不到更细的数就够了，
 * 而且 admin 手动扣分也混在 delta < 0 里，多取一些留出被过滤掉的余量。
 */
const SCAN_SIZE = 60;

interface TransactionDoc {
  _id: string;
  source?: string;
  createdAt?: unknown;
}

/**
 * 兑换提醒轮询接口。CloudBase 的 node-sdk 没有 watch()（实时监听只在小程序/
 * web 端 SDK 上有），所以这里用前端定时拉最新兑换记录来近似实时，
 * 由前端拿 createdAt 和本地游标比对算出未读条数。
 *
 * 这是个 10 秒一次的高频接口，所以只回 id + createdAt：昵称头像要再 join
 * users、还要换头像临时链接，一次多花 1~2 秒，而红点根本用不到这些字段。
 * 兑换明细由 /api/points/transactions?direction=spend 单独取。
 */
export async function GET() {
  try {
    const db = getDb();
    const _ = db.command;

    const { data } = await getOrEmpty(
      db
        .collection("points_transactions")
        .where({ delta: _.lt(0) })
        .orderBy("createdAt", "desc")
        .limit(SCAN_SIZE)
        .field({ _id: true, source: true, createdAt: true })
        .get()
    );

    const redemptions = (data as TransactionDoc[])
      .filter((doc) => isRedeemAlert(doc.source ?? ""))
      .map((doc) => ({ id: doc._id, createdAt: toIsoString(doc.createdAt) }));

    return NextResponse.json({
      redemptions,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询兑换提醒失败" },
      { status: 500 }
    );
  }
}
