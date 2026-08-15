"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DrawResult } from "./post-modules";

function routeData(startIndex: number, result: DrawResult, width = 940, height = 520) {
  const count = result.pool.length;
  const left = 55, right = width - 55, top = 72, bottom = height - 62;
  const spacing = count > 1 ? (right - left) / (count - 1) : 0;
  const rows = Math.max(5, ...result.rungs.map((rung) => rung.row + 1));
  const rowGap = (bottom - top) / (rows + 1);
  let column = startIndex;
  let path = `M ${left + column * spacing} ${top}`;
  for (let row = 0; row < rows; row += 1) {
    const y = top + (row + 1) * rowGap;
    path += ` V ${y}`;
    const rung = result.rungs.find((item) => item.row === row && (item.left === column || item.left + 1 === column));
    if (rung) {
      column = rung.left === column ? column + 1 : column - 1;
      path += ` H ${left + column * spacing}`;
    }
  }
  return { path: `${path} V ${bottom}`, end: column };
}

export function DrawLightbox({ result, onClose }: { result: DrawResult; onClose: () => void }) {
  const [run, setRun] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const visual = useRef<HTMLDivElement | null>(null);
  const routeDataList = useMemo(() => result.winners.map((winner) => routeData(result.pool.indexOf(winner), result)), [result]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elements = visual.current?.querySelectorAll<SVGPathElement>(".draw-route") || [];
    const animations = Array.from(elements).map((path, index) => {
      const length = path.getTotalLength();
      return path.animate([{ strokeDasharray: `${length}`, strokeDashoffset: length, opacity: .25 }, { strokeDasharray: `${length}`, strokeDashoffset: 0, opacity: 1 }], {
        duration: reduced ? 1 : 2400 + index * 260, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards",
      }).finished;
    });
    const cards = visual.current?.querySelectorAll<HTMLElement>(".picker-card") || [];
    const cardAnimations = Array.from(cards).map((card, index) => card.animate([
      { transform: "translateY(0) rotate(0)", opacity: .55 },
      { transform: `translateY(${index % 2 ? -12 : 12}px) rotate(${index % 2 ? 2 : -2}deg)`, opacity: 1 },
      { transform: "translateY(0) rotate(0)", opacity: .75 },
    ], { duration: reduced ? 1 : 900 + index * 45, iterations: reduced ? 1 : 2, easing: "ease-in-out" }).finished);
    let active = true;
    void Promise.all([...animations, ...cardAnimations]).then(() => { if (active) setRevealed(true); });
    return () => { active = false; };
  }, [result, run]);

  const width = 940, height = 520, left = 55, right = width - 55, top = 72, bottom = height - 62;
  const spacing = result.pool.length > 1 ? (right - left) / (result.pool.length - 1) : 0;
  const rows = Math.max(5, ...result.rungs.map((rung) => rung.row + 1));
  const rowGap = (bottom - top) / (rows + 1);
  const winningEnds = new Set(routeDataList.map((item) => item.end));

  return <div className="draw-lightbox-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="draw-lightbox" role="dialog" aria-modal="true" aria-labelledby="draw-lightbox-title">
      <header><div><p className="eyebrow">抽選動畫</p><h2 id="draw-lightbox-title">{result.mode === "ladder" ? "爬格子結果揭示" : "隨機選人結果揭示"}</h2></div><button type="button" onClick={onClose} aria-label="關閉抽選動畫">×</button></header>
      <div className="draw-stage" ref={visual}>
        <div className="draw-stage-head"><span>動畫只呈現已由伺服器鎖定的結果</span><b>{revealed ? "結果已揭示" : "動畫播放中"}</b></div>
        {result.mode === "ladder" ? <div className="draw-svg-scroll"><svg className="draw-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="爬格子抽選路徑">
          {result.pool.map((name, index) => { const x = left + index * spacing; return <g key={name}><text className="draw-label" x={x} y="31">{name}</text><path className="draw-base" d={`M ${x} ${top} V ${bottom}`} /><text className="draw-prize" x={x} y={height - 22}>{winningEnds.has(index) ? "中選" : "—"}</text></g>; })}
          {result.rungs.map((rung, index) => { const y = top + (rung.row + 1) * rowGap; return <path className="draw-base" key={`${rung.row}-${rung.left}-${index}`} d={`M ${left + rung.left * spacing} ${y} H ${left + (rung.left + 1) * spacing}`} />; })}
          {routeDataList.map((route, index) => <path className="draw-route" key={index} d={route.path} />)}
        </svg></div> : <div className="picker-grid">{result.pool.map((name) => <div className={revealed && result.winners.includes(name) ? "picker-card winner" : "picker-card"} key={name}>{name}</div>)}</div>}
        <div className={revealed ? "draw-reveal" : "draw-reveal hidden"}><span>本次抽選結果</span><strong>{result.winners.join("、")}</strong><small>{result.serial}</small></div>
      </div>
      <footer><button className="button button-outline" type="button" onClick={() => { setRevealed(false); setRun((value) => value + 1); }}>重播同一結果</button><button className="button button-primary" type="button" onClick={onClose}>完成</button></footer>
    </section>
  </div>;
}
