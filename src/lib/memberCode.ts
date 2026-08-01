const CODE_PREFIX = "NUTS";
const MAX_AGE_MS = 5 * 60 * 1000;

export type ParsedMemberCode = { openid: string } | { error: string };

/** 会员二维码内容格式：NUTS|openid|timestamp（毫秒），5 分钟内有效 */
export function parseMemberCode(text: string, now = Date.now()): ParsedMemberCode {
  const parts = text.split("|");
  if (parts.length !== 3 || parts[0] !== CODE_PREFIX) {
    return { error: "不是有效的 Nuts 会员码" };
  }
  const [, openid, timestampStr] = parts;
  const timestamp = Number(timestampStr);
  if (!openid || !Number.isFinite(timestamp)) {
    return { error: "二维码内容格式不正确" };
  }
  if (Math.abs(now - timestamp) > MAX_AGE_MS) {
    return { error: "二维码已过期，请让用户刷新后重新扫码" };
  }
  return { openid };
}
