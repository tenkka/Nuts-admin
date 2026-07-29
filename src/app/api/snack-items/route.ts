import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";
import { SNACK_CATEGORIES } from "@/lib/snackCategories";
import { getSession } from "@/lib/session";

interface SnackItemDoc {
  _id: string;
  name?: string;
  category?: string;
  pointsCost?: number | string;
  isActive?: boolean;
  store?: number[];
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  try {
    const db = getDb();
    const { data } = await db.collection("snack_items").limit(1000).get();
    const items = (data as SnackItemDoc[]).map((doc) => ({
      id: doc._id,
      name: doc.name ?? "",
      category: doc.category ?? "",
      pointsCost: Number(doc.pointsCost ?? 0),
      isActive: doc.isActive ?? true,
      store: doc.store ?? [],
    }));
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询菜品失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { name, category, pointsCost, store, isActive } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "菜品名称不能为空" }, { status: 400 });
    }
    if (!SNACK_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "种类不合法" }, { status: 400 });
    }
    if (typeof pointsCost !== "number" || pointsCost < 0) {
      return NextResponse.json({ error: "积分价格不合法" }, { status: 400 });
    }
    if (!Array.isArray(store) || store.length === 0 || !store.every((s) => typeof s === "number")) {
      return NextResponse.json({ error: "请至少选择一个门店" }, { status: 400 });
    }

    const db = getDb();
    const { id } = await db.collection("snack_items").add({
      name,
      category,
      pointsCost,
      store,
      isActive: isActive ?? true,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建菜品失败" },
      { status: 500 }
    );
  }
}
