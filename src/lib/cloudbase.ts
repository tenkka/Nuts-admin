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
