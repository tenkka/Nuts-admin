import { getDb } from "./cloudbase";
import { chunk, pickUrl, resolveCloudFileUrls } from "./cloudFiles";

const IN_QUERY_BATCH_SIZE = 100;
/**
 * users 里同一 openid 存在重复文档，一批 100 个 openid 可能命中 100 条以上，
 * 所以查询上限要留出余量（CloudBase 单次最多 1000 条）。
 */
const IN_QUERY_LIMIT = 1000;

export interface UserLite {
  id: string;
  openid: string;
  nick: string;
  phone: string;
  avatarUrl: string;
}

interface UserDoc {
  _id: string;
  openid?: string;
  nick?: string;
  phone?: string;
  avatarUrl?: string;
}

/** 昵称 > 手机号 > 头像，用来在重复文档里挑信息最全的一条 */
export function userCompleteness(doc: {
  nick?: string;
  phone?: string;
  avatarUrl?: string;
}): number {
  return (doc.nick ? 4 : 0) + (doc.phone ? 2 : 0) + (doc.avatarUrl ? 1 : 0);
}

/**
 * users 里存在同一 openid 的重复文档（历史遗留）。直接建 Map 会随机保留最后一条，
 * 可能把有昵称的那条覆盖成空的，所以统一按信息完整度择优。
 */
export function dedupeUsersByOpenid<
  T extends { openid?: string; nick?: string; phone?: string; avatarUrl?: string },
>(docs: T[]): T[] {
  const best = new Map<string, T>();
  for (const doc of docs) {
    if (!doc.openid) continue;
    const current = best.get(doc.openid);
    if (!current || userCompleteness(doc) > userCompleteness(current)) {
      best.set(doc.openid, doc);
    }
  }
  return [...best.values()];
}

/**
 * 按 openid 批量取用户基本信息，头像已换成临时地址。
 * 积分、余额、桌台等集合都只存 openid，展示时需要 join 回 users。
 */
export async function getUsersByOpenid(
  openids: (string | undefined | null)[]
): Promise<Map<string, UserLite>> {
  const unique = [...new Set(openids.filter((id): id is string => !!id))];
  if (unique.length === 0) return new Map();

  const db = getDb();
  const _ = db.command;

  const batches = await Promise.all(
    chunk(unique, IN_QUERY_BATCH_SIZE).map((ids) =>
      db
        .collection("users")
        .where({ openid: _.in(ids) })
        .limit(IN_QUERY_LIMIT)
        .get()
    )
  );
  const docs = dedupeUsersByOpenid(
    batches.flatMap(({ data }) => data as UserDoc[])
  );

  const avatarMap = await resolveCloudFileUrls(docs.map((d) => d.avatarUrl));

  return new Map(
    docs
      .filter((doc) => !!doc.openid)
      .map((doc) => [
        doc.openid as string,
        {
          id: doc._id,
          openid: doc.openid as string,
          nick: doc.nick ?? "",
          phone: doc.phone ?? "",
          avatarUrl: pickUrl(doc.avatarUrl, avatarMap),
        },
      ])
  );
}

/** join 不到用户时的占位，避免前端到处判空 */
export function fallbackUser(openid: string): UserLite {
  return { id: "", openid, nick: "", phone: "", avatarUrl: "" };
}
