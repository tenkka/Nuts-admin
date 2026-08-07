import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb, getOrEmpty } from "@/lib/cloudbase";
import { fallbackUser, getUsersByOpenid } from "@/lib/userLookup";
import { toIsoString } from "@/lib/serialize";

const DEFAULT_SIZE = 20;
const MAX_SIZE = 100;

interface TransactionDoc {
  _id: string;
  openid?: string;
  delta?: number;
  type?: string;
  source?: string;
  sourceId?: string | null;
  description?: string;
  operatorOpenid?: string | null;
  balanceBefore?: number;
  balanceAfter?: number;
  storeId?: string | null;
  storeName?: string | null;
  createdAt?: unknown;
}

/**
 * 积分流水。带 openid 就是单个用户的历史记录，不带就是全站最新流水。
 * direction=earn 只看增加（delta > 0），direction=spend 只看兑换/扣除（delta < 0），
 * 不传则两种都返回。
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const openid = params.get("openid")?.trim() || "";
    const direction = params.get("direction")?.trim() || "";
    const page = Math.max(0, Number(params.get("page") ?? 0) || 0);
    const size = Math.min(
      MAX_SIZE,
      Math.max(1, Number(params.get("size") ?? DEFAULT_SIZE) || DEFAULT_SIZE)
    );

    const db = getDb();
    const _ = db.command;

    const query: Record<string, unknown> = {};
    if (openid) query.openid = openid;
    if (direction === "earn") query.delta = _.gt(0);
    else if (direction === "spend") query.delta = _.lt(0);

    const { data } = await getOrEmpty(
      db
        .collection("points_transactions")
        .where(query)
        .orderBy("createdAt", "desc")
        .skip(page * size)
        .limit(size)
        .get()
    );

    const docs = data as TransactionDoc[];
    const userMap = openid
      ? new Map()
      : await getUsersByOpenid(docs.map((d) => d.openid));

    const transactions = docs.map((doc) => {
      const user =
        userMap.get(doc.openid ?? "") ?? fallbackUser(doc.openid ?? "");
      return {
        id: doc._id,
        openid: doc.openid ?? "",
        nick: user.nick,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        delta: doc.delta ?? 0,
        type: doc.type ?? "",
        source: doc.source ?? "",
        sourceId: doc.sourceId ?? null,
        description: doc.description ?? "",
        balanceBefore: doc.balanceBefore ?? 0,
        balanceAfter: doc.balanceAfter ?? 0,
        storeName: doc.storeName ?? "",
        createdAt: toIsoString(doc.createdAt),
      };
    });

    return NextResponse.json({
      transactions,
      page,
      hasMore: docs.length === size,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询积分流水失败" },
      { status: 500 }
    );
  }
}
