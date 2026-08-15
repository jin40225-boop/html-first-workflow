"use client";

import { useState } from "react";
import { RECEIPT_NAMES } from "./board-config";
import { PostModules } from "./post-modules";

type ModuleKey = keyof PostModules;
const MODULES: Array<{ key: ModuleKey; title: string; note: string }> = [
  { key: "qr", title: "網址與 QR", note: "輸入內容後產生 QR" },
  { key: "receipt", title: "傳閱單", note: "指定人員留名與未留統計" },
  { key: "relay", title: "接龍", note: "依姓名彙整接龍內容" },
  { key: "poll", title: "投票", note: "具名投票，可看誰選了什麼" },
  { key: "draw", title: "選人／爬格子", note: "結果鎖定並以燈箱播放" },
];

function defaults(key: ModuleKey): NonNullable<PostModules[ModuleKey]> {
  const values = {
    qr: { value: "", label: "QR Code" },
    receipt: { audience: [...RECEIPT_NAMES] },
    relay: { prompt: "請留下接龍內容" },
    poll: { options: ["選項一", "選項二"] },
    draw: { mode: "ladder" as const, pool: [...RECEIPT_NAMES], count: 1 },
  };
  return values[key] as NonNullable<PostModules[ModuleKey]>;
}

function PeopleEditor({ values, onChange, id }: { values: string[]; onChange: (next: string[]) => void; id: string }) {
  const [custom, setCustom] = useState("");
  const candidates = Array.from(new Set([...RECEIPT_NAMES, ...values]));
  function add() {
    const name = custom.trim().slice(0, 40);
    if (!name) return;
    onChange(Array.from(new Set([...values, name])));
    setCustom("");
  }
  return <>
    <div className="member-actions"><button className="button button-small button-outline" type="button" onClick={() => onChange([...RECEIPT_NAMES])}>既定 12 人</button><button className="button button-small button-outline" type="button" onClick={() => onChange([])}>全部取消</button></div>
    <div className="member-checks">{candidates.map((name) => <label className="member-check" key={name}><input type="checkbox" checked={values.includes(name)} onChange={(event) => onChange(event.target.checked ? [...values, name] : values.filter((item) => item !== name))} />{name}</label>)}</div>
    <div className="custom-person"><input id={id} value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="新增其他姓名" /><button className="button button-outline" type="button" onClick={add}>＋ 加入姓名</button></div>
  </>;
}

export function PostModuleEditor({ value, onChange }: { value: PostModules; onChange: (next: PostModules) => void }) {
  const poll = value.poll;
  function toggle(key: ModuleKey, enabled: boolean) {
    const next = { ...value };
    if (enabled) Object.assign(next, { [key]: defaults(key) }); else delete next[key];
    onChange(next);
  }
  return <section className="module-editor">
    <div className="module-heading"><div><h3>選填功能</h3><p>基礎貼文固定保留文字、附件燈箱與留言。</p></div></div>
    <div className="module-grid">{MODULES.map((item) => <label className="module-choice" key={item.key}><input type="checkbox" checked={Boolean(value[item.key])} onChange={(event) => toggle(item.key, event.target.checked)} /><strong>{item.title}</strong><small>{item.note}</small></label>)}</div>
    {value.qr && <fieldset className="module-fields"><legend>網址與 QR</legend><label>QR 標題<input value={value.qr.label} onChange={(event) => onChange({ ...value, qr: { ...value.qr!, label: event.target.value } })} /></label><label>QR 內容<input value={value.qr.value} onChange={(event) => onChange({ ...value, qr: { ...value.qr!, value: event.target.value } })} placeholder="可輸入網址或文字" /></label></fieldset>}
    {value.receipt && <fieldset className="module-fields"><legend>傳閱對象（目前 {value.receipt.audience.length} 人）</legend><PeopleEditor id="receipt-custom-person" values={value.receipt.audience} onChange={(audience) => onChange({ ...value, receipt: { audience } })} /></fieldset>}
    {value.relay && <fieldset className="module-fields"><legend>接龍</legend><label>接龍提示<input value={value.relay.prompt} onChange={(event) => onChange({ ...value, relay: { prompt: event.target.value } })} /></label></fieldset>}
    {poll && <fieldset className="module-fields"><legend>具名投票選項</legend>{poll.options.map((option, index) => <div className="poll-option-edit" key={index}><input aria-label={`投票選項 ${index + 1}`} value={option} onChange={(event) => onChange({ ...value, poll: { options: poll.options.map((item, optionIndex) => optionIndex === index ? event.target.value : item) } })} /><button className="text-button danger-text" type="button" onClick={() => onChange({ ...value, poll: { options: poll.options.filter((_, optionIndex) => optionIndex !== index) } })} disabled={poll.options.length <= 2}>移除</button></div>)}<button className="button button-small button-outline" type="button" onClick={() => onChange({ ...value, poll: { options: [...poll.options, `選項 ${poll.options.length + 1}`].slice(0, 8) } })} disabled={poll.options.length >= 8}>＋ 新增選項</button></fieldset>}
    {value.draw && <fieldset className="module-fields"><legend>選人／爬格子</legend><div className="two-fields"><label>動畫方式<select value={value.draw.mode} onChange={(event) => onChange({ ...value, draw: { ...value.draw!, mode: event.target.value === "picker" ? "picker" : "ladder" } })}><option value="ladder">爬格子路徑動畫</option><option value="picker">隨機選人翻牌動畫</option></select></label><label>抽出人數<select value={value.draw.count} onChange={(event) => onChange({ ...value, draw: { ...value.draw!, count: Number(event.target.value) } })}><option value="1">1 人</option><option value="2">2 人</option><option value="3">3 人</option></select></label></div><PeopleEditor id="draw-custom-person" values={value.draw.pool} onChange={(pool) => onChange({ ...value, draw: { ...value.draw!, pool, count: Math.min(value.draw!.count, Math.max(1, pool.length)) } })} /></fieldset>}
  </section>;
}
