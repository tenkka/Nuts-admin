import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";
import { BOOKING_STATUSES, type BookingStatus } from "@/lib/bookings";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = (await request.json()) as { status?: string };

    if (!BOOKING_STATUSES.includes(status as BookingStatus)) {
      return NextResponse.json({ error: "状态不合法" }, { status: 400 });
    }

    const db = getDb();
    await db.collection("bookings").doc(id).update({ status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新预约状态失败" },
      { status: 500 }
    );
  }
}
