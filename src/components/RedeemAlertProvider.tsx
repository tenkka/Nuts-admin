"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/** 只够算红点用。兑换明细在 /api/points/transactions?direction=spend */
export interface RedeemAlert {
  id: string;
  createdAt: string;
}

interface RedeemAlertContextValue {
  /** 最近的兑换记录（最新在前），红点和兑换页的刷新都基于它 */
  redemptions: RedeemAlert[];
  /** 未读兑换条数 */
  unread: number;
  /** 把游标推到当前，红点清零 */
  markAllRead: () => void;
  /** 立即拉一次，不等下一个轮询周期 */
  refresh: () => void;
}

const POLL_INTERVAL = 10_000;
/** 已读游标存本地，刷新页面后红点不会又冒出来 */
const SEEN_KEY = "nuts_admin_redeem_seen_at";

const RedeemAlertContext = createContext<RedeemAlertContextValue>({
  redemptions: [],
  unread: 0,
  markAllRead: () => {},
  refresh: () => {},
});

export function useRedeemAlerts() {
  return useContext(RedeemAlertContext);
}

function timeOf(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/**
 * 兑换消息提醒。CloudBase 的服务端 SDK 没有 watch()（实时监听只在小程序/web 端
 * SDK 上有，而后台用的是带密钥的 node-sdk），所以这里用定时轮询近似实时：
 * 每 10 秒拉一次最新兑换记录，比本地已读游标新的就算未读。
 */
export default function RedeemAlertProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [redemptions, setRedemptions] = useState<RedeemAlert[]>([]);
  // 直接在初始化时读游标。首屏 redemptions 还是空的，unread 两端都是 0，不会 hydration 不一致
  const [seenAt, setSeenAt] = useState<string>(() =>
    typeof window === "undefined"
      ? ""
      : window.localStorage.getItem(SEEN_KEY) ?? ""
  );
  // 轮询回调里要读最新游标，用 ref 避免把 load 绑到 seenAt 上反复重建定时器
  const seenRef = useRef<string>(seenAt);

  const writeSeen = useCallback((value: string) => {
    seenRef.current = value;
    setSeenAt(value);
    window.localStorage.setItem(SEEN_KEY, value);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/points/redeem-alerts", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const body = await res.json();
      const list: RedeemAlert[] = body.redemptions ?? [];
      setRedemptions(list);

      // 首次进来把游标停在"现在"，否则历史兑换会一次性全变成未读
      if (!seenRef.current) {
        writeSeen(list[0]?.createdAt || body.serverTime || new Date().toISOString());
      }
    } catch {
      // 轮询失败就等下一轮，不打扰界面
    }
  }, [writeSeen]);

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;

    const tick = async () => {
      // 后台标签页不轮询，切回来时由 visibilitychange 立刻补一次
      if (!document.hidden) await load();
      if (!stopped) timer = window.setTimeout(tick, POLL_INTERVAL);
    };
    tick();

    const onVisibility = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  const unread = useMemo(() => {
    if (!seenAt) return 0;
    const seen = timeOf(seenAt);
    return redemptions.filter((r) => timeOf(r.createdAt) > seen).length;
  }, [redemptions, seenAt]);

  const markAllRead = useCallback(() => {
    const newest = redemptions.reduce(
      (max, r) => Math.max(max, timeOf(r.createdAt)),
      0
    );
    // 取服务端最新记录和本地当前时间的较大值，两边时钟有偏差也不会漏读
    writeSeen(new Date(Math.max(newest, Date.now())).toISOString());
  }, [redemptions, writeSeen]);

  const value = useMemo(
    () => ({ redemptions, unread, markAllRead, refresh: load }),
    [redemptions, unread, markAllRead, load]
  );

  return (
    <RedeemAlertContext.Provider value={value}>
      {children}
    </RedeemAlertContext.Provider>
  );
}
