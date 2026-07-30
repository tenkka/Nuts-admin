export const SNACK_CATEGORIES = ["小吃", "零食", "饮品", "周边"] as const;
export type SnackCategory = (typeof SNACK_CATEGORIES)[number];
