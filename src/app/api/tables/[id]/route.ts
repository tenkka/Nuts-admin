import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";
import { ACTIVE_BOOKING_STATUSES } from "@/lib/bookings";

const EDITABLE_FIELDS = ["name", "storeId", "maxplayer", "sort", "isOpen"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    if ("maxplayer" in update) {
      const maxplayer = update.maxplayer;
      if (typeof maxplayer !== "number" || maxplayer < 1) {
        return NextResponse.json({ error: "人数上限不合法" }, { status: 400 });
      }
    }

    const db = getDb();
    await db.collection("tables").doc(id).update(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新桌台失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const _ = db.command;

    // 桌上还有人时不允许直接删，否则这些预约会变成孤儿记录
    const { total } = await db
      .collection("bookings")
      .where({ tableId: id, status: _.in(ACTIVE_BOOKING_STATUSES) })
      .count();

    if (total && total > 0) {
      return NextResponse.json(
        { error: `该桌台还有 ${total} 条进行中的预约，请先处理后再删除` },
        { status: 409 }
      );
    }

    await db.collection("tables").doc(id).remove();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除桌台失败" },
      { status: 500 }
    );
  }
}
