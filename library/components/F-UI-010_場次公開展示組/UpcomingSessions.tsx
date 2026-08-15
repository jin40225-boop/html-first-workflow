/**
 * 動態「即將舉行場次」區塊。【CLAUDE 整合 2026-07-19】
 * 取代首頁/互助聚會頁手寫的即將場次卡：改讀 Supabase（getUpcomingSessions，
 * 走 sessions_public view），後台開新場次即自動出現、過期自動消失，
 * 不再需要手動維護兩份靜態活動卡。歷史場次卡仍為手寫策展內容。
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CalendarClock, Clock, Users } from 'lucide-react';
import { getProjectBySlug, getUpcomingSessions } from '@/lib/api';
import type { SessionSlot } from '@contracts/types';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月 ${d.getDate()}日 (${WEEKDAYS[d.getDay()]})`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export interface UpcomingSessionsProps {
  /** 專案 slug（預設互助聚會） */
  projectSlug?: string;
  /** 報名頁站內路徑（交給 react-router，勿含 BASE 前綴） */
  registerPath?: string;
  /** 一併列出尚未上架的場次，標示「即將開放」且不可報名。 */
  includeUnpublished?: boolean;
  /** 顯示「主題／客座嘉賓」列；未公布時顯示「神秘驚喜！」。 */
  showTopic?: boolean;
}

export function UpcomingSessions({
  projectSlug = 'peer-group',
  registerPath = '/peer-group/register',
  includeUnpublished = false,
  showTopic = false,
}: UpcomingSessionsProps) {
  const [sessions, setSessions] = useState<SessionSlot[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const project = await getProjectBySlug(projectSlug);
        if (!project) throw new Error('project not found');
        const list = await getUpcomingSessions(project.id, { includeUnpublished });
        if (alive) setSessions(list);
      } catch {
        if (alive) {
          setFailed(true);
          setSessions([]);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [projectSlug]);

  if (sessions === null) {
    return (
      <div className="session-card">
        <div className="p-6 text-gray-500 font-bold flex items-center gap-2">
          <CalendarClock className="w-5 h-5" /> 場次載入中…
        </div>
      </div>
    );
  }

  // 未公布主題／來賓時，依裁決 3 顯示「神秘驚喜！」而非留白。
  const mystery = (value?: string) =>
    value ? <>{value}</> : <span className="font-black text-highlight">神秘驚喜！</span>;

  if (sessions.length === 0) {
    return (
      <div className="session-card">
        <div className="p-6 space-y-2">
          <p className="font-bold text-brown flex items-center gap-2">
            <CalendarClock className="w-5 h-5" />
            下一場次籌備中！
          </p>
          <p className="text-gray-600 text-sm leading-relaxed">
            {failed
              ? '場次資訊暫時無法載入，歡迎加入官方 LINE 接收最新活動通知。'
              : '新場次公布後會直接出現在這裡，也歡迎加入官方 LINE 搶先接收通知！'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {sessions.map((s) => {
        const remaining = Math.max(0, s.capacity - s.bookedCount);
        const isFull = s.status === 'full' || remaining === 0;
        const notYetOpen = s.status === 'closed';
        return (
          <div className="session-card" key={s.id}>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="session-tag bg-accent-orange text-brown">
                  {new Date(s.startsAt).getMonth() + 1}月場
                </span>
                {notYetOpen ? (
                  <span className="session-tag bg-gray-200 text-gray-600">即將開放</span>
                ) : null}
                <span className="font-bold text-brown text-lg">{s.title}</span>
              </div>
              {showTopic ? (
                <p className="text-brown font-bold">
                  主題：{mystery(s.topic)}
                  <span className="mx-2 text-brown/30">·</span>
                  客座嘉賓：{mystery(s.guest)}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-4 text-sm font-bold text-gray-600 bg-white/50 p-3 rounded-lg border border-brown/10">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> {fmtDate(s.startsAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {fmtTime(s.startsAt)} - {fmtTime(s.endsAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" /> {notYetOpen ? '尚未開放報名' : isFull ? '已額滿' : `剩 ${remaining} 名`}
                </span>
              </div>
              <div className="flex gap-3 pt-2">
                {notYetOpen ? (
                  <span className="btn-warm py-2 px-4 bg-gray-200 text-gray-500 text-sm pointer-events-none">
                    即將開放，敬請期待
                  </span>
                ) : isFull ? (
                  <span className="btn-warm py-2 px-4 bg-gray-200 text-gray-500 text-sm pointer-events-none">
                    已額滿
                  </span>
                ) : (
                  <Link className="btn-warm py-2 px-4 bg-accent-orange text-brown hover:bg-[#FFB74D] text-sm" to={registerPath}>
                    立即報名
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
