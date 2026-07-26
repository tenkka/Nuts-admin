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
