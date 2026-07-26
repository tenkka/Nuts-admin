/** 占位中的预约状态，与小程序 getTables / adminGetData 保持一致 */
export const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed", "seated"] as const;

/** 预约可流转到的全部状态 */
export const BOOKING_STATUSES = [
  ...ACTIVE_BOOKING_STATUSES,
  "cancelled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "待确认",
  confirmed: "已确认",
  seated: "已入座",
  cancelled: "已取消",
};

export const BOOKING_TYPE_LABELS: Record<string, string> = {
  booking: "预约",
  queue: "排队",
};
