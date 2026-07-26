import { getCloudbaseApp } from "./cloudbase";

const TEMP_URL_BATCH_SIZE = 50;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * 把 cloud:// 开头的文件 ID 批量换成临时访问地址。
 * 返回 fileID -> tempFileURL 的映射，非 cloud:// 的地址不会出现在映射里。
 */
export async function resolveCloudFileUrls(
  urls: (string | undefined | null)[]
): Promise<Map<string, string>> {
  const fileList = [
    ...new Set(
      urls.filter(
        (url): url is string => !!url && url.startsWith("cloud://")
      )
    ),
  ];
  if (fileList.length === 0) return new Map();

  const app = getCloudbaseApp();
  const batches = await Promise.all(
    chunk(fileList, TEMP_URL_BATCH_SIZE).map((list) =>
      app.getTempFileURL({ fileList: list })
    )
  );

  return new Map(
    batches.flatMap(({ fileList: resolved }) =>
      resolved
        .filter((f) => !!f.tempFileURL)
        .map((f) => [f.fileID, f.tempFileURL] as const)
    )
  );
}

/** 单个头像地址：cloud:// 换成临时地址，其余原样返回 */
export function pickUrl(
  url: string | undefined | null,
  map: Map<string, string>
): string {
  if (!url) return "";
  return map.get(url) ?? url;
}

export { chunk };
