export const PRODUCT_CATEGORIES = ["套餐", "鸡尾酒", "啤酒", "小食", "下午茶", "甜品"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
