/**
 * CloudBase 的 db.serverDate() 字段读回来可能是 Date、ISO 字符串，
 * 也可能是 { $date: ... } 形式，统一转成 ISO 字符串给前端。
 */
export function toIsoString(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number") return new Date(value).toISOString();
  if (typeof value === "object" && "$date" in (value as object)) {
    const inner = (value as { $date: unknown }).$date;
    if (typeof inner === "string" || typeof inner === "number") {
      return new Date(inner).toISOString();
    }
  }
  return "";
}
