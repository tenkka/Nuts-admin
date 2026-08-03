import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb, getOrEmpty } from "@/lib/cloudbase";
import { getSession } from "@/lib/session";
import { pickUrl, resolveCloudFileUrls } from "@/lib/cloudFiles";
import { dedupeUsersByOpenid } from "@/lib/userLookup";
import { toIsoString } from "@/lib/serialize";

const MAX_DOCS = 1000;

interface UserDoc {
  _id: string;
  openid?: string;
  nick?: string;
  phone?: string;
  avatarUrl?: string;
}

interface StorePowerDoc {
  openid?: string;
  storeId?: number;
  totalPower?: number;
  championCount?: number;
  updatedAt?: unknown;
}

/**
 * 战力/冠军次数排行榜。带 storeId 就是单个门店的榜单，不带就是把该用户
 * 在所有门店的记录加总（跨门店总计）。
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  try {
    const storeIdParam = request.nextUrl.searchParams.get("storeId");
    const storeId = storeIdParam ? Number(storeIdParam) : null;

    const db = getDb();
    const query = storeId ? { storeId } : {};
    const [usersRes, powerRes] = await Promise.all([
      db.collection("users").limit(MAX_DOCS).get(),
      getOrEmpty(
        db.collection("user_store_power").where(query).limit(MAX_DOCS).get()
      ),
    ]);

    const userDocs = dedupeUsersByOpenid(usersRes.data as UserDoc[]);
    const powerDocs = powerRes.data as StorePowerDoc[];

    // 不指定门店时，同一个 openid 可能有多条（每个门店一条），要合并成一条总计
    const statsMap = new Map<
      string,
      { totalPower: number; championCount: number; updatedAt: unknown }
    >();
    for (const doc of powerDocs) {
      if (!doc.openid) continue;
      const current = statsMap.get(doc.openid) ?? {
        totalPower: 0,
        championCount: 0,
        updatedAt: doc.updatedAt,
      };
      current.totalPower += doc.totalPower ?? 0;
      current.championCount += doc.championCount ?? 0;
      if (
        doc.updatedAt &&
        (!current.updatedAt || toIsoString(doc.updatedAt) > toIsoString(current.updatedAt))
      ) {
        current.updatedAt = doc.updatedAt;
      }
      statsMap.set(doc.openid, current);
    }

    const avatarMap = await resolveCloudFileUrls(
      userDocs.map((doc) => doc.avatarUrl)
    );

    const rankings = userDocs
      .map((doc) => {
        const stats = statsMap.get(doc.openid as string);
        return {
          userId: doc._id,
          openid: doc.openid as string,
          nick: doc.nick ?? "",
          phone: doc.phone ?? "",
          avatarUrl: pickUrl(doc.avatarUrl, avatarMap),
          totalPower: stats?.totalPower ?? 0,
          championCount: stats?.championCount ?? 0,
          updatedAt: toIsoString(stats?.updatedAt),
        };
      })
      .sort((a, b) => b.totalPower - a.totalPower);

    return NextResponse.json({ rankings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询战力排行失败" },
      { status: 500 }
    );
  }
}
