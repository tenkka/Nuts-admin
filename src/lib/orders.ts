/** balanceLogs.type 的已知取值（来自小程序各云函数写入） */
export const ORDER_TYPE_LABELS: Record<string, string> = {
  consume: "消费",
  recharge: "充值",
  admin_add: "管理员充值",
  lottery: "抽奖赠送",
};

export const ORDER_TYPE_COLORS: Record<string, string> = {
  consume: "red",
  recharge: "green",
  admin_add: "blue",
  lottery: "purple",
};

/** balanceLogs.method 的已知取值 */
export const ORDER_METHOD_LABELS: Record<string, string> = {
  wechat: "微信支付",
  free: "余额支付",
  admin_deduct: "管理员划扣",
};

export function orderTypeLabel(type: string): string {
  return ORDER_TYPE_LABELS[type] ?? type ?? "-";
}

export function orderMethodLabel(method: string): string {
  if (!method) return "-";
  return ORDER_METHOD_LABELS[method] ?? method;
}
