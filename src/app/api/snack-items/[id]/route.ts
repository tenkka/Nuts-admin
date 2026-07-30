import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";
import { getSession } from "@/lib/session";
import { SNACK_CATEGORIES } from "@/lib/snackCategories";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const update: Record<string, unknown> = {};

    if ("name" in body) {
      if (!body.name || typeof body.name !== "string") {
        return NextResponse.json({ error: "菜品名称不能为空" }, { status: 400 });
      }
      update.name = body.name;
    }
    if ("category" in body) {
      if (!SNACK_CATEGORIES.includes(body.category)) {
        return NextResponse.json({ error: "种类不合法" }, { status: 400 });
      }
      update.category = body.category;
    }
    if ("pointsCost" in body) {
      if (typeof body.pointsCost !== "number" || body.pointsCost < 0) {
        return NextResponse.json({ error: "积分价格不合法" }, { status: 400 });
      }
      update.pointsCost = body.pointsCost;
    }
    if ("store" in body) {
      if (
        !Array.isArray(body.store) ||
        body.store.length === 0 ||
        !body.store.every((s: unknown) => typeof s === "number")
      ) {
        return NextResponse.json({ error: "请至少选择一个门店" }, { status: 400 });
      }
      update.store = body.store;
    }
    if ("isActive" in body) {
      update.isActive = !!body.isActive;
    }
    if ("image" in body) {
      update.image = typeof body.image === "string" ? body.image : "";
    }
    if ("unit" in body) {
      update.unit = typeof body.unit === "string" ? body.unit : "";
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
    }

    const db = getDb();
    await db.collection("snack_items").doc(id).update(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新菜品失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const db = getDb();
    await db.collection("snack_items").doc(id).remove();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除菜品失败" },
      { status: 500 }
    );
  }
}
