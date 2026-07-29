import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";
import { getSession } from "@/lib/session";

const EDITABLE_FIELDS = [
  "nick",
  "phone",
  "power",
  "rechargeBalance",
  "giftBalance",
  "lotteryTickets",
  "inviteCode",
  "champion",
] as const;

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
    for (const field of EDITABLE_FIELDS) {
      if (field in body) update[field] = body[field];
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
    }

    const db = getDb();
    await db.collection("users").doc(id).update(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新用户失败" },
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
    await db.collection("users").doc(id).remove();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除用户失败" },
      { status: 500 }
    );
  }
}
