import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudbase";
import { pickUrl, resolveCloudFileUrls } from "@/lib/cloudFiles";
import { toIsoString } from "@/lib/serialize";

const MAX_DOCS = 1000;

interface UserDoc {
  _id: string;
  openid?: string;
  nick?: string;
  phone?: string;
  avatarUrl?: string;
}

interface PointAccountDoc {
  _id: string;
  openid?: string;
  balance?: number;
  totalEarned?: number;
  totalSpent?: number;
  updatedAt?: unknown;
}

/**
 * 积分账户列表。以 users 为主表左连 user_points，
 * 这样还没有积分账户的用户也能在后台被搜到并发放积分。
 */
export async function GET() {
  try {
    const db = getDb();
    const [usersRes, accountsRes] = await Promise.all([
      db.collection("users").limit(MAX_DOCS).get(),
      db.collection("user_points").limit(MAX_DOCS).get(),
    ]);

    const userDocs = usersRes.data as UserDoc[];
    const accountDocs = accountsRes.data as PointAccountDoc[];

    const accountMap = new Map(
      accountDocs
        .filter((doc) => !!doc.openid)
        .map((doc) => [doc.openid as string, doc])
    );

    const avatarMap = await resolveCloudFileUrls(
      userDocs.map((doc) => doc.avatarUrl)
    );

    const accounts = userDocs
      .filter((doc) => !!doc.openid)
      .map((doc) => {
        const account = accountMap.get(doc.openid as string);
        return {
          userId: doc._id,
          openid: doc.openid as string,
          nick: doc.nick ?? "",
          phone: doc.phone ?? "",
          avatarUrl: pickUrl(doc.avatarUrl, avatarMap),
          hasAccount: !!account,
          balance: account?.balance ?? 0,
          totalEarned: account?.totalEarned ?? 0,
          totalSpent: account?.totalSpent ?? 0,
          updatedAt: toIsoString(account?.updatedAt),
        };
      })
      .sort((a, b) => b.balance - a.balance);

    return NextResponse.json({ accounts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询积分账户失败" },
      { status: 500 }
    );
  }
}

/**
 * 手动加/扣积分。逻辑与小程序云函数 adminAddPoints 保持一致：
 * 更新 user_points 汇总的同时写一条 points_transactions 流水。
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { openid, amount, description } = body as {
      openid?: string;
      amount?: number;
      description?: string;
    };

    if (!openid || typeof openid !== "string") {
      return NextResponse.json({ error: "缺少目标用户" }, { status: 400 });
    }
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount === 0) {
      return NextResponse.json({ error: "积分数量无效" }, { status: 400 });
    }
    if (!Number.isInteger(amount)) {
      return NextResponse.json({ error: "积分必须是整数" }, { status: 400 });
    }

    const db = getDb();
    const _ = db.command;
    const now = db.serverDate({ offset: 0 });

    const type = amount > 0 ? "earn" : "spend";
    const absAmount = Math.abs(amount);

    const accountRes = await db
      .collection("user_points")
      .where({ openid })
      .limit(1)
      .get();
    const account = (accountRes.data as PointAccountDoc[])[0];

    const balanceBefore = account?.balance ?? 0;
    const balanceAfter = balanceBefore + amount;

    if (balanceAfter < 0) {
      return NextResponse.json(
        { error: `积分不足，当前余额 ${balanceBefore}` },
        { status: 400 }
      );
    }

    if (!account) {
      await db.collection("user_points").add({
        openid,
        balance: amount,
        totalEarned: amount > 0 ? amount : 0,
        totalSpent: amount < 0 ? absAmount : 0,
        updatedAt: now,
      });
    } else {
      const update: Record<string, unknown> = {
        balance: _.inc(amount),
        updatedAt: now,
      };
      if (type === "earn") update.totalEarned = _.inc(absAmount);
      else update.totalSpent = _.inc(absAmount);

      await db.collection("user_points").doc(account._id).update(update);
    }

    await db.collection("points_transactions").add({
      openid,
      delta: amount,
      type,
      source: "admin",
      sourceId: null,
      description:
        description?.trim() ||
        (amount > 0 ? `管理员赠送 ${amount} 积分` : `管理员扣除 ${absAmount} 积分`),
      operatorOpenid: null,
      balanceBefore,
      balanceAfter,
      createdAt: now,
    });

    return NextResponse.json({ balanceBefore, balanceAfter });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "调整积分失败" },
      { status: 500 }
    );
  }
}
