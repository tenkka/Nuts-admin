import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";
import { pickUrl, resolveCloudFileUrls } from "@/lib/cloudFiles";
import { toIsoString } from "@/lib/serialize";
import { ACTIVE_BOOKING_STATUSES } from "@/lib/bookings";

const MAX_TABLES = 500;
const MAX_BOOKINGS = 500;

interface TableDoc {
  _id: string;
  name?: string;
  storeId?: number;
  maxplayer?: number;
  sort?: number;
  isOpen?: boolean;
}

interface BookingDoc {
  _id: string;
  tableId?: string;
  tableName?: string;
  openid?: string;
  nick?: string;
  avatarUrl?: string;
  type?: string;
  arrivalTime?: string;
  queueNo?: number;
  status?: string;
  createdAt?: unknown;
}

interface StoreDoc {
  id: number;
  name: string;
}

export async function GET() {
  try {
    const db = getDb();
    const _ = db.command;

    const [tablesRes, bookingsRes, storesRes] = await Promise.all([
      db
        .collection("tables")
        .orderBy("storeId", "asc")
        .orderBy("sort", "asc")
        .limit(MAX_TABLES)
        .get(),
      db
        .collection("bookings")
        .where({ status: _.in(ACTIVE_BOOKING_STATUSES) })
        .orderBy("createdAt", "asc")
        .limit(MAX_BOOKINGS)
        .get(),
      db.collection("stores").limit(100).get(),
    ]);

    const tableDocs = tablesRes.data as TableDoc[];
    const bookingDocs = bookingsRes.data as BookingDoc[];
    const storeDocs = storesRes.data as StoreDoc[];

    const storeMap = new Map(storeDocs.map((s) => [s.id, s.name]));
    const avatarMap = await resolveCloudFileUrls(
      bookingDocs.map((b) => b.avatarUrl)
    );

    const bookingsByTable = new Map<string, BookingDoc[]>();
    for (const booking of bookingDocs) {
      if (!booking.tableId) continue;
      const list = bookingsByTable.get(booking.tableId);
      if (list) list.push(booking);
      else bookingsByTable.set(booking.tableId, [booking]);
    }

    const tables = tableDocs.map((doc) => {
      const related = bookingsByTable.get(doc._id) ?? [];
      const seatCount = related.filter((b) => b.type === "booking").length;
      const queueCount = related.filter((b) => b.type === "queue").length;
      const maxplayer = doc.maxplayer ?? 0;

      return {
        id: doc._id,
        name: doc.name ?? "",
        storeId: doc.storeId ?? null,
        storeName:
          doc.storeId != null
            ? storeMap.get(doc.storeId) ?? `#${doc.storeId}`
            : "",
        maxplayer,
        sort: doc.sort ?? 0,
        isOpen: doc.isOpen ?? false,
        seatCount,
        queueCount,
        isFull: maxplayer > 0 && seatCount >= maxplayer,
        bookings: related.map((b) => ({
          id: b._id,
          openid: b.openid ?? "",
          nick: b.nick ?? "",
          avatarUrl: pickUrl(b.avatarUrl, avatarMap),
          type: b.type ?? "",
          arrivalTime: b.arrivalTime ?? "",
          queueNo: b.queueNo ?? 0,
          status: b.status ?? "",
          createdAt: toIsoString(b.createdAt),
        })),
      };
    });

    const stores = storeDocs.map((s) => ({ id: s.id, name: s.name }));

    return NextResponse.json({ tables, stores });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询桌台失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, storeId, maxplayer, sort, isOpen } = body as {
      name?: string;
      storeId?: number;
      maxplayer?: number;
      sort?: number;
      isOpen?: boolean;
    };

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "桌台名称不能为空" }, { status: 400 });
    }
    if (typeof storeId !== "number") {
      return NextResponse.json({ error: "请选择门店" }, { status: 400 });
    }
    if (typeof maxplayer !== "number" || maxplayer < 1) {
      return NextResponse.json({ error: "人数上限不合法" }, { status: 400 });
    }

    const db = getDb();
    const { id } = await db.collection("tables").add({
      name,
      storeId,
      maxplayer,
      sort: typeof sort === "number" ? sort : 0,
      isOpen: isOpen ?? true,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建桌台失败" },
      { status: 500 }
    );
  }
}
