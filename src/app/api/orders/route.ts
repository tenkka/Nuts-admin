import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/cloudbase";
import { fallbackUser, getUsersByOpenid } from "@/lib/userLookup";
import { toIsoString } from "@/lib/serialize";

const DEFAULT_SIZE = 20;
const MAX_SIZE = 100;

interface BalanceLogDoc {
  _id: string;
  openid?: string;
  nick?: string;
  type?: string;
  method?: string;
  rechargeAmount?: number;
  giftAmount?: number;
  wechatAmount?: number;
  realPrice?: number;
  note?: string;
  productId?: string | null;
  outTradeNo?: string;
  operatorOpenid?: string | null;
  createdAt?: unknown;
}

/**
 * 订单（余额流水 balanceLogs）。
 * 带 openid 就是某个用户的历史记录，不带就是全站订单列表。
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const openid = params.get("openid")?.trim() || "";
    const type = params.get("type")?.trim() || "";
    const page = Math.max(0, Number(params.get("page") ?? 0) || 0);
    const size = Math.min(
      MAX_SIZE,
      Math.max(1, Number(params.get("size") ?? DEFAULT_SIZE) || DEFAULT_SIZE)
    );

    const query: Record<string, string> = {};
    if (openid) query.openid = openid;
    if (type) query.type = type;

    const db = getDb();
    const collection = () => db.collection("balanceLogs").where(query);

    const [listRes, countRes] = await Promise.all([
      collection()
        .orderBy("createdAt", "desc")
        .skip(page * size)
        .limit(size)
        .get(),
      collection().count(),
    ]);

    const docs = listRes.data as BalanceLogDoc[];
    const userMap = await getUsersByOpenid(docs.map((d) => d.openid));

    const orders = docs.map((doc) => {
      const user =
        userMap.get(doc.openid ?? "") ?? fallbackUser(doc.openid ?? "");
      const recharge = doc.rechargeAmount ?? 0;
      const gift = doc.giftAmount ?? 0;
      return {
        id: doc._id,
        openid: doc.openid ?? "",
        // 流水里冗余存了下单时的昵称，用户改名后以 users 表为准
        nick: user.nick || doc.nick || "",
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        type: doc.type ?? "",
        method: doc.method ?? "",
        rechargeAmount: recharge,
        giftAmount: gift,
        totalAmount: Number((recharge + gift).toFixed(2)),
        wechatAmount: doc.wechatAmount ?? 0,
        realPrice: doc.realPrice ?? 0,
        note: doc.note ?? "",
        productId: doc.productId ?? null,
        outTradeNo: doc.outTradeNo ?? "",
        createdAt: toIsoString(doc.createdAt),
      };
    });

    return NextResponse.json({
      orders,
      page,
      size,
      total: countRes.total ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询订单失败" },
      { status: 500 }
    );
  }
}
