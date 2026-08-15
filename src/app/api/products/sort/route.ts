import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";
import { getSession } from "@/lib/session";

const MAX_ITEMS = 1000;

/**
 * 保存套餐顺序。前端把当前完整的 id 列表按显示顺序传过来，
 * 这里按下标写回 sort 字段。只更新真正变了的那几条。
 */
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const ids = body?.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "缺少套餐顺序" }, { status: 400 });
    }
    if (ids.length > MAX_ITEMS) {
      return NextResponse.json({ error: "套餐数量超出上限" }, { status: 400 });
    }
    if (!ids.every((id: unknown) => typeof id === "string" && id)) {
      return NextResponse.json({ error: "套餐 id 不合法" }, { status: 400 });
    }
    if (new Set(ids).size !== ids.length) {
      return NextResponse.json({ error: "套餐 id 有重复" }, { status: 400 });
    }

    const db = getDb();
    const { data } = await db
      .collection("products")
      .field({ _id: true, sort: true })
      .limit(MAX_ITEMS)
      .get();

    const currentSort = new Map(
      (data as { _id: string; sort?: number }[]).map((doc) => [doc._id, doc.sort])
    );

    const changed = (ids as string[])
      .map((id, index) => ({ id, index }))
      .filter(({ id, index }) => currentSort.has(id) && currentSort.get(id) !== index);

    await Promise.all(
      changed.map(({ id, index }) =>
        db.collection("products").doc(id).update({ sort: index })
      )
    );

    return NextResponse.json({ updated: changed.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存套餐顺序失败" },
      { status: 500 }
    );
  }
}
