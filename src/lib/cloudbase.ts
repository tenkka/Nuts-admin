import cloudbase from "@cloudbase/node-sdk";

let app: ReturnType<typeof cloudbase.init> | null = null;

export function getCloudbaseApp() {
  if (app) return app;

  const envId = process.env.CLOUDBASE_ENV_ID;
  const secretId = process.env.CLOUDBASE_SECRET_ID;
  const secretKey = process.env.CLOUDBASE_SECRET_KEY;

  if (!envId || !secretId || !secretKey) {
    throw new Error(
      "缺少 CloudBase 配置，请在 .env.local 中设置 CLOUDBASE_ENV_ID、CLOUDBASE_SECRET_ID、CLOUDBASE_SECRET_KEY"
    );
  }

  app = cloudbase.init({ env: envId, secretId, secretKey });
  return app;
}

export function getDb() {
  return getCloudbaseApp().database();
}

/**
 * CloudBase 的集合不会在第一次写入时自动建好，必须先在控制台或用
 * db.createCollection() 手动建表，读一个还没建过的集合会直接抛
 * DATABASE_COLLECTION_NOT_EXIST，而不是返回空数组。这个helper把这种
 * "表还没建"的情况当成空结果处理，避免页面因为新表还没建就整个 500。
 */
export async function getOrEmpty<T>(
  promise: Promise<{ data: T[] }>
): Promise<{ data: T[] }> {
  try {
    return await promise;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "DATABASE_COLLECTION_NOT_EXIST"
    ) {
      return { data: [] };
    }
    throw error;
  }
}
