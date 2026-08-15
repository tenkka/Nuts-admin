import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";
import { getSession } from "@/lib/session";
import { pickUrl, resolveCloudFileUrls } from "@/lib/cloudFiles";

interface ProductDoc {
  _id: string;
  name?: string;
  price?: number;
  bonusPoints?: number;
  cloudImage?: string;
  desc?: string;
  isActive?: boolean;
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
    const { data } = await db.collection("products").limit(1000).get();
    const docs = (data as ProductDoc[])
      .slice()
      .sort((a, b) => sortValue(a) - sortValue(b));

    const imageUrlMap = await resolveCloudFileUrls(docs.map((doc) => doc.cloudImage));

    const products = docs.map((doc) => ({
      id: doc._id,
      name: doc.name ?? "",
      price: doc.price ?? 0,
      bonusPoints: doc.bonusPoints ?? 0,
      desc: doc.desc ?? "",
      isActive: doc.isActive ?? true,
      image: pickUrl(doc.cloudImage, imageUrlMap),
    }));
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询套餐失败" },
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
    const { name, price, bonusPoints, desc, isActive, image } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
    }
    if (typeof price !== "number" || price < 0) {
      return NextResponse.json({ error: "价格不合法" }, { status: 400 });
    }
    if (typeof bonusPoints !== "number" || bonusPoints < 0) {
      return NextResponse.json({ error: "赠送积分不合法" }, { status: 400 });
    }

    const db = getDb();

    // 新记录排到最后，不然没有 sort 就默认插到已排序的那批前面去了
    const { data: existing } = await db
      .collection("products")
      .field({ sort: true })
      .limit(1000)
      .get();
    const maxSort = (existing as { sort?: number }[]).reduce(
      (max, doc) => (typeof doc.sort === "number" ? Math.max(max, doc.sort) : max),
      -1
    );

    const { id } = await db.collection("products").add({
      name,
      price,
      bonusPoints,
      desc: typeof desc === "string" ? desc : "",
      isActive: isActive ?? true,
      cloudImage: typeof image === "string" ? image : "",
      // 一次都还没排过序时不写 sort，写了反而会插到那批老数据前面去
      ...(maxSort >= 0 ? { sort: maxSort + 1 } : {}),
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建套餐失败" },
      { status: 500 }
    );
  }
}
