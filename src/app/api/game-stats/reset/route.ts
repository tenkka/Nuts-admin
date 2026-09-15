import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";
import { getSession } from "@/lib/session";

function isCollectionNotExist(error: unknown) {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "DATABASE_COLLECTION_NOT_EXIST"
  );
}

/** 清空一个集合里的所有文档；集合还没建过就当已经是空的，不算错误。 */
async function removeAllDocs(
  db: ReturnType<typeof getDb>,
  collectionName: string
) {
  try {
    // CloudBase 的 remove() 不接受真正的空 query（会报 "Param query can't
    // be empty"），用 _id 一定存在这个条件来表达"匹配所有文档"。
    const _ = db.command;
    await db.collection(collectionName).where({ _id: _.exists(true) }).remove();
  } catch (error) {
    if (!isCollectionNotExist(error)) throw error;
  }
}

/**
 * 一键清零：把 user_store_power 里所有门店、所有用户的战力和冠军次数汇总
 * 记录，以及 game_logs 里对应的历史流水，全部删掉。GET /api/game-stats
 * 里没记录的用户本来就按 0 显示，所以删记录和把每条记录都改成 0 效果
 * 一样，但更干净。
 */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  try {
    const db = getDb();
    await Promise.all([
      removeAllDocs(db, "user_store_power"),
      removeAllDocs(db, "game_logs"),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "清零失败" },
      { status: 500 }
    );
  }
}
