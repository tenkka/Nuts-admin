/** points_transactions.source 的已知取值（来自小程序各云函数写入） */
export const POINTS_SOURCE_LABELS: Record<string, string> = {
  admin: "管理员操作",
  redeem: "积分兑换",
  checkin: "签到",
  lottery: "抽奖",
  manual: "手动",
};

export function pointsSourceLabel(source: string): string {
  return POINTS_SOURCE_LABELS[source] ?? source ?? "-";
}

/**
 * 后台自己发起的加/扣积分也会写一条 delta < 0 的流水，但那是管理员刚点的按钮，
 * 没必要再给自己弹一次提醒，所以红点只统计来自小程序的兑换。
 */
export function isRedeemAlert(source: string): boolean {
  return source !== "admin";
}
