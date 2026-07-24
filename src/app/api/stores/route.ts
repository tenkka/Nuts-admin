import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";

interface StoreDoc {
  _id: string;
  id: number;
  name: string;
  city?: string;
}

export async function GET() {
  try {
    const db = getDb();
    const { data } = await db.collection("stores").limit(1000).get();
    const stores = (data as StoreDoc[]).map((doc) => ({
      id: doc.id,
      name: doc.name,
      city: doc.city ?? "",
    }));
    return NextResponse.json({ stores });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询门店失败" },
      { status: 500 }
    );
  }
}
