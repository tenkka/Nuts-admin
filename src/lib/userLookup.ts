import { getDb } from "./cloudbase";
import { chunk, pickUrl, resolveCloudFileUrls } from "./cloudFiles";

const IN_QUERY_BATCH_SIZE = 100;

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
        .limit(IN_QUERY_BATCH_SIZE)
        .get()
    )
  );
  const docs = batches.flatMap(({ data }) => data as UserDoc[]);

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
