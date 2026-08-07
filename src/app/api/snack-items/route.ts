import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";
import { SNACK_CATEGORIES } from "@/lib/snackCategories";
import { getSession } from "@/lib/session";
import { pickUrl, resolveCloudFileUrls } from "@/lib/cloudFiles";

interface SnackItemDoc {
  _id: string;
  name?: string;
  category?: string;
  pointsCost?: number | string;
  isActive?: boolean;
  store?: number[];
  image?: string;
  unit?: string;
  sort?: number;
}

/** 还没排过序的老数据排在最后，彼此之间保持原有顺序（Array.sort 是稳定的） */
const UNSORTED = Number.MAX_SAFE_INTEGER;

function sortValue(doc: { sort?: number }): number {
  return typeof doc.sort === "number" ? doc.sort : UNSORTED;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  try {
    const db = getDb();
    const { data } = await db.collection("snack_items").limit(1000).get();
    // 按后台拖拽出来的顺序返回，小程序端直接照这个顺序展示
    const docs = (data as SnackItemDoc[])
      .slice()
      .sort((a, b) => sortValue(a) - sortValue(b));

    const imageUrlMap = await resolveCloudFileUrls(docs.map((doc) => doc.image));

    const items = docs.map((doc) => ({
      id: doc._id,
      name: doc.name ?? "",
      category: doc.category ?? "",
      pointsCost: Number(doc.pointsCost ?? 0),
      isActive: doc.isActive ?? true,
      store: doc.store ?? [],
      image: pickUrl(doc.image, imageUrlMap),
      unit: doc.unit ?? "",
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
    const { name, category, pointsCost, store, isActive, image, unit } = body;

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

    // 新菜品排到最后，不然没有 sort 就默认插到已排序的那批前面去了
    const { data: existing } = await db
      .collection("snack_items")
      .field({ sort: true })
      .limit(1000)
      .get();
    const maxSort = (existing as { sort?: number }[]).reduce(
      (max, doc) => (typeof doc.sort === "number" ? Math.max(max, doc.sort) : max),
      -1
    );

    const { id } = await db.collection("snack_items").add({
      name,
      category,
      pointsCost,
      store,
      isActive: isActive ?? true,
      image: typeof image === "string" ? image : "",
      unit: typeof unit === "string" ? unit : "",
      // 一次都还没排过序时不写 sort，写了反而会插到那批老数据前面去
      ...(maxSort >= 0 ? { sort: maxSort + 1 } : {}),
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建菜品失败" },
      { status: 500 }
    );
  }
}
