const CODE_PREFIX = "NUTS_REDEEM";

export type ParsedRedeemCode = { orderId: string } | { error: string };

/** 核销二维码内容格式：NUTS_REDEEM|orderId，小程序端下单成功后生成 */
export function parseRedeemCode(text: string): ParsedRedeemCode {
  const parts = text.split("|");
  if (parts.length !== 2 || parts[0] !== CODE_PREFIX) {
    return { error: "不是有效的核销码" };
  }
  const [, orderId] = parts;
  if (!orderId) {
    return { error: "核销码内容格式不正确" };
  }
  return { orderId };
}
