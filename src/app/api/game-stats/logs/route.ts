import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb, getOrEmpty } from "@/lib/cloudbase";
import { getSession } from "@/lib/session";
import { toIsoString } from "@/lib/serialize";

const DEFAULT_SIZE = 20;
const MAX_SIZE = 100;

interface GameLogDoc {
  _id: string;
  openid?: string;
  storeId?: number;
  powerDelta?: number;
  championDelta?: number;
  source?: string;
  note?: string;
  createdAt?: unknown;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  try {
    const params = request.nextUrl.searchParams;
    const openid = params.get("openid")?.trim();
    if (!openid) {
      return NextResponse.json({ error: "缺少 openid" }, { status: 400 });
    }
    const storeIdParam = params.get("storeId");
    const storeId = storeIdParam ? Number(storeIdParam) : null;
    const size = Math.min(
      MAX_SIZE,
      Math.max(1, Number(params.get("size") ?? DEFAULT_SIZE) || DEFAULT_SIZE)
    );

    const db = getDb();
    const query: Record<string, unknown> = { openid };
    if (storeId) query.storeId = storeId;

    const { data } = await getOrEmpty(
      db
        .collection("game_logs")
        .where(query)
        .orderBy("createdAt", "desc")
        .limit(size)
        .get()
    );

    const logs = (data as GameLogDoc[]).map((doc) => ({
      id: doc._id,
      storeId: doc.storeId ?? null,
      powerDelta: doc.powerDelta ?? 0,
      championDelta: doc.championDelta ?? 0,
      source: doc.source ?? "",
      note: doc.note ?? "",
      createdAt: toIsoString(doc.createdAt),
    }));

    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询战力流水失败" },
      { status: 500 }
    );
  }
}
