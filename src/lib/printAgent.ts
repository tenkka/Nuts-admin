"use client";

const DEFAULT_BASE_URL = "http://127.0.0.1:9527";
const STORAGE_KEY = "nuts_print_agent_base_url";

export interface ReceiptLine {
  text: string;
  align?: "left" | "center" | "right";
  bold?: boolean;
  size?: "normal" | "double";
}

export function getAgentBaseUrl(): string {
  if (typeof window === "undefined") return DEFAULT_BASE_URL;
  return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_BASE_URL;
}

export function setAgentBaseUrl(url: string) {
  window.localStorage.setItem(STORAGE_KEY, url);
}

async function agentFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${getAgentBaseUrl()}${path}`, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || "本地打印/扫码代理请求失败");
  }
  return body;
}

export function checkAgentHealth() {
  return agentFetch("/health") as Promise<{
    ok: boolean;
    version: string;
    selectedPrinter: string | null;
  }>;
}

export function listPrinters() {
  return agentFetch("/printers") as Promise<{
    printers: string[];
    selected: string | null;
  }>;
}

export function selectPrinter(name: string) {
  return agentFetch("/printer/select", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  }) as Promise<{ ok: true; selectedPrinter: string }>;
}

/**
 * 打印小票，app 里任何页面都可以直接调用这个函数，
 * 不需要重新选择打印机——本地代理已经记住了上次的选择。
 */
export function printReceipt(options: {
  lines: ReceiptLine[];
  feed?: number;
  cut?: boolean;
}) {
  return agentFetch("/print", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  }) as Promise<{ ok: true }>;
}
