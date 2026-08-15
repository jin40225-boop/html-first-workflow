"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import MarqueeModule, { type MarqueeProps } from "react-fast-marquee";
import { type ComponentType, useCallback, useEffect, useState } from "react";

type MarqueeItem = {
  id: number;
  message: string;
  level: "general" | "important" | "emergency";
  speed: "slow" | "standard" | "fast";
  href: string;
};

const LEVEL_LABEL = { general: "公告", important: "重要", emergency: "緊急" } as const;
const SPEED = { slow: 30, standard: 45, fast: 65 } as const;
const Marquee = ((MarqueeModule as unknown as { default?: ComponentType<MarqueeProps> }).default || MarqueeModule) as ComponentType<MarqueeProps>;

export function GlobalMarquee({ editor }: { editor: boolean }) {
  const pathname = usePathname();
  const [items, setItems] = useState<MarqueeItem[]>([]);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const load = useCallback(async () => {
    if (!editor || pathname === "/") return;
    const response = await fetch("/api/marquee", { cache: "no-store" }).catch(() => null);
    if (!response?.ok) return;
    const data = await response.json().catch(() => ({ items: [] }));
    setItems(Array.isArray(data.items) ? data.items : []);
  }, [editor, pathname]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(query.matches);
    updateMotion();
    query.addEventListener("change", updateMotion);
    return () => query.removeEventListener("change", updateMotion);
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    window.addEventListener("marquee:refresh", load);
    const timer = window.setInterval(load, 60_000);
    return () => { window.clearTimeout(initial); window.removeEventListener("marquee:refresh", load); window.clearInterval(timer); };
  }, [load]);

  if (!editor || pathname === "/" || items.length === 0) return null;
  const content = items.map((item) => <Link className="global-marquee-item" data-level={item.level} href={item.href} key={item.id}><span>{LEVEL_LABEL[item.level]}</span><strong>{item.message}</strong><small>開啟原貼文</small></Link>);
  return <section className="global-marquee" data-level={items[0].level} aria-label="全域公告跑馬燈">
    <div className="global-marquee-label">全域公告</div>
    <div className="global-marquee-track" aria-live="polite">
      {reducedMotion ? <div className="global-marquee-static">{content}</div> : <Marquee autoFill gradient={false} pauseOnHover pauseOnClick play={!paused} speed={Math.max(...items.map((item) => SPEED[item.speed]))}>{content}</Marquee>}
    </div>
    {!reducedMotion && <button type="button" className="global-marquee-pause" onClick={() => setPaused((value) => !value)} aria-pressed={paused}>{paused ? "繼續" : "暫停"}</button>}
  </section>;
}
