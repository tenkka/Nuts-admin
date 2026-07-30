import { NextResponse } from "next/server";
import { getCloudbaseApp } from "@/lib/cloudbase";
import { getSession } from "@/lib/session";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请选择要上传的图片" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "只支持 jpg/png/webp/gif 格式的图片" },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "图片不能超过 5MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = EXT_BY_TYPE[file.type];
    const cloudPath = `menu_items/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const app = getCloudbaseApp();
    const { fileID } = await app.uploadFile({ cloudPath, fileContent: buffer });
    const { fileList } = await app.getTempFileURL({ fileList: [fileID] });
    const tempFileURL = fileList[0]?.tempFileURL ?? "";

    return NextResponse.json({ fileID, url: tempFileURL });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "上传图片失败" },
      { status: 500 }
    );
  }
}
