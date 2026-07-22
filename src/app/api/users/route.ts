import { NextResponse } from "next/server";
import { getCloudbaseApp, getDb } from "@/lib/cloudbase";

interface UserDoc {
  _id: string;
  nick?: string;
  phone?: string;
  openid?: string;
  avatarUrl?: string;
  power?: number;
  rechargeBalance?: number;
  giftBalance?: number;
  lotteryTickets?: number;
  inviteCode?: string;
  champion?: number;
  createdAt?: string;
}

const TEMP_URL_BATCH_SIZE = 50;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function GET() {
  try {
    const db = getDb();
    const { data } = await db.collection("users").limit(1000).get();
    const docs = data as UserDoc[];

    const cloudAvatars = docs
      .map((doc) => doc.avatarUrl)
      .filter((url): url is string => !!url && url.startsWith("cloud://"));

    let avatarUrlMap = new Map<string, string>();
    if (cloudAvatars.length > 0) {
      const app = getCloudbaseApp();
      const batches = await Promise.all(
        chunk(cloudAvatars, TEMP_URL_BATCH_SIZE).map((fileList) =>
          app.getTempFileURL({ fileList })
        )
      );
      avatarUrlMap = new Map(
        batches.flatMap(({ fileList }) =>
          fileList.map((f) => [f.fileID, f.tempFileURL] as const)
        )
      );
    }

    const users = docs.map((doc) => ({
      id: doc._id,
      nick: doc.nick ?? "",
      phone: doc.phone ?? "",
      openid: doc.openid ?? "",
      avatarUrl: doc.avatarUrl
        ? avatarUrlMap.get(doc.avatarUrl) ?? doc.avatarUrl
        : "",
      power: doc.power ?? 0,
      rechargeBalance: doc.rechargeBalance ?? 0,
      giftBalance: doc.giftBalance ?? 0,
      lotteryTickets: doc.lotteryTickets ?? 0,
      inviteCode: doc.inviteCode ?? "",
      champion: doc.champion ?? 0,
      createdAt: doc.createdAt ?? "",
    }));

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询用户失败" },
      { status: 500 }
    );
  }
}
