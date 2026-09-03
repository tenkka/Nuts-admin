import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";
import { getSession } from "@/lib/session";

/**
 * 一键清零：把 user_store_power 里所有门店、所有用户的战力和冠军次数记录
 * 全部删掉。GET /api/game-stats 里没记录的用户本来就按 0 显示，
 * 所以删记录和把每条记录都改成 0 效果一样，但更干净。
 */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  try {
    const db = getDb();
    // CloudBase 的 remove() 不接受真正的空 query（会报 "Param query can't
    // be empty"），用 _id 一定存在这个条件来表达"匹配所有文档"。
    const _ = db.command;
    await db.collection("user_store_power").where({ _id: _.exists(true) }).remove();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "DATABASE_COLLECTION_NOT_EXIST"
    ) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "清零失败" },
      { status: 500 }
    );
  }
}
