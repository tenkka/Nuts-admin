import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";
import { getSession } from "@/lib/session";

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
