/**
 * 活動軌跡（裁決 6）。
 *
 * 過期場次不下架、永久留存，依年度摺疊、標示「已結束」，讓新朋友看見社群的累積。
 * 資料來自 `sessions_public` 且只取 `status='done'`：
 *   - `cancelled`（含測試資料）與未上架場次永遠不會出現在公開軌跡；
 *   - view 不含 `meet_url`，歷史 Meet 連結因此自然下架。
 */
import { useEffect, useState } from 'react';
import { CalendarCheck, ChevronDown } from 'lucide-react';
import { getPastSessions, getProjectBySlug } from '@/lib/api';
import type { SessionSlot } from '@contracts/types';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function fmt(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 西元轉民國，配合站上既有的「115 年」用法。 */
function rocYear(iso: string) {
  return new Date(iso).getFullYear() - 1911;
}

export interface SessionHistoryProps {
  projectSlug?: string;
  /** 標題文字；不同服務頁可自訂。 */
  title?: string;
  description?: string;
}

export function SessionHistory({
  projectSlug = 'peer-group',
  title = '👣 活動軌跡・已完成場次',
  description = '這些是我們過去美好的回憶！所有場次永久留存，讓新朋友看見這個社群的累積。',
}: SessionHistoryProps) {
  const [sessions, setSessions] = useState<SessionSlot[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const project = await getProjectBySlug(projectSlug);
        if (!project) throw new Error('project not found');
        const list = await getPastSessions(project.id);
        if (alive) setSessions(list);
      } catch {
        if (alive) setSessions([]);
      }
    })();
    return () => { alive = false; };
  }, [projectSlug]);

  if (sessions === null || sessions.length === 0) return null;

  const years = [...new Set(sessions.map((s) => rocYear(s.startsAt)))].sort((a, b) => b - a);

  return (
    <section className="max-w-4xl mx-auto px-4 mt-16" aria-label="活動軌跡">
      <div className="bg-white border-2 border-brown rounded-3xl p-6 md:p-8 shadow-[8px_8px_0_rgba(93,64,55,0.15)]">
        <h2 className="font-heading text-2xl font-black text-brown flex items-center gap-2">
          <CalendarCheck className="w-6 h-6" aria-hidden="true" /> {title}
        </h2>
        <p className="text-gray-600 mt-2 mb-4">{description}</p>
        {years.map((year, index) => {
          const items = sessions.filter((s) => rocYear(s.startsAt) === year);
          return (
            <details key={year} open={index === 0} className="border-t-2 border-dashed border-brown/20 pt-3 mt-3">
              <summary className="cursor-pointer font-heading font-black text-brown flex items-center gap-2">
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
                📂 {year} 年（{items.length} 場）
              </summary>
              <ul className="mt-3 space-y-3 list-none p-0">
                {items.map((s) => (
                  <li key={s.id} className="bg-cream border-2 border-brown/15 rounded-2xl p-4">
                    <span className="inline-block bg-gray-200 text-gray-600 text-xs font-bold px-3 py-1 rounded-full border border-brown/20">
                      已結束
                    </span>
                    <p className="font-bold text-brown mt-2">
                      {fmt(s.startsAt)} {s.topic ?? s.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {s.guest ? <>客座嘉賓：{s.guest}｜</> : null}
                      {fmtTime(s.startsAt)}–{fmtTime(s.endsAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </section>
  );
}
