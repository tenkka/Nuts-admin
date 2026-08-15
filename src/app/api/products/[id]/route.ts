import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";
import { getSession } from "@/lib/session";

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
        return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
      }
      update.name = body.name;
    }
    if ("price" in body) {
      if (typeof body.price !== "number" || body.price < 0) {
        return NextResponse.json({ error: "价格不合法" }, { status: 400 });
      }
      update.price = body.price;
    }
    if ("bonusPoints" in body) {
      if (typeof body.bonusPoints !== "number" || body.bonusPoints < 0) {
        return NextResponse.json({ error: "赠送积分不合法" }, { status: 400 });
      }
      update.bonusPoints = body.bonusPoints;
    }
    if ("desc" in body) {
      update.desc = typeof body.desc === "string" ? body.desc : "";
    }
    if ("isActive" in body) {
      update.isActive = !!body.isActive;
    }
    if ("image" in body) {
      update.cloudImage = typeof body.image === "string" ? body.image : "";
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
    }

    const db = getDb();
    await db.collection("products").doc(id).update(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新套餐失败" },
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
    await db.collection("products").doc(id).remove();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除套餐失败" },
      { status: 500 }
    );
  }
}
