import { NextResponse } from "next/server";
import { getDb, getOrEmpty } from "@/lib/cloudbase";
import { getSession } from "@/lib/session";

interface StorePowerDoc {
  _id: string;
  totalPower?: number;
  championCount?: number;
}

/**
 * 手动补录/调整某个用户在某个门店的战力、冠军次数。
 * 和 /api/points 的写法保持一致：更新 user_store_power 汇总的同时
 * 写一条 game_logs 流水，方便以后核对。
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { openid, storeId, powerDelta, championDelta, note } = body as {
      openid?: string;
      storeId?: number;
      powerDelta?: number;
      championDelta?: number;
      note?: string;
    };

    if (!openid || typeof openid !== "string") {
      return NextResponse.json({ error: "缺少目标用户" }, { status: 400 });
    }
    if (typeof storeId !== "number" || !Number.isFinite(storeId)) {
      return NextResponse.json({ error: "缺少门店" }, { status: 400 });
    }
    const power = Number.isFinite(powerDelta) ? Math.trunc(powerDelta as number) : 0;
    const champion = Number.isFinite(championDelta)
      ? Math.trunc(championDelta as number)
      : 0;
    if (power === 0 && champion === 0) {
      return NextResponse.json(
        { error: "请至少填写战力或冠军次数的变化量" },
        { status: 400 }
      );
    }

    const db = getDb();
    const _ = db.command;
    const now = db.serverDate({ offset: 0 });

    const existingRes = await getOrEmpty(
      db.collection("user_store_power").where({ openid, storeId }).limit(1).get()
    );
    const existing = (existingRes.data as StorePowerDoc[])[0];

    const powerBefore = existing?.totalPower ?? 0;
    const championBefore = existing?.championCount ?? 0;
    const powerAfter = powerBefore + power;
    const championAfter = championBefore + champion;

    if (powerAfter < 0) {
      return NextResponse.json(
        { error: `战力不能为负数，当前为 ${powerBefore}` },
        { status: 400 }
      );
    }
    if (championAfter < 0) {
      return NextResponse.json(
        { error: `冠军次数不能为负数，当前为 ${championBefore}` },
        { status: 400 }
      );
    }

    if (!existing) {
      await db.collection("user_store_power").add({
        openid,
        storeId,
        totalPower: power,
        championCount: champion,
        updatedAt: now,
      });
    } else {
      await db
        .collection("user_store_power")
        .doc(existing._id)
        .update({
          totalPower: _.inc(power),
          championCount: _.inc(champion),
          updatedAt: now,
        });
    }

    await db.collection("game_logs").add({
      openid,
      storeId,
      powerDelta: power,
      championDelta: champion,
      source: "admin",
      note: note?.trim() || "",
      createdAt: now,
    });

    return NextResponse.json({ totalPower: powerAfter, championCount: championAfter });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "调整失败" },
      { status: 500 }
    );
  }
}
