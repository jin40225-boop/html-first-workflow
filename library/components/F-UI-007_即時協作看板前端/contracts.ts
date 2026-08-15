/* ============================================================
 * 活動同步狀態板 · Updated TypeScript contracts
 * ============================================================
 *
 * Drop into:  src/lib/contracts.ts
 *
 * Changes vs. original:
 *   + new fields:  mood, intent, hand_raised, cued, is_locked
 *   - removed:     intro_text, note_text (moved into status_text or out entirely)
 *   + new tables:  sessions, chat_messages, reactions
 *   + extended:    board_state.session_id, board_state.timer_*
 *
 * Existing tables can be ALTER TABLEd (Google Sheet → add columns).
 * ============================================================ */

import { z } from "zod";

/* ── enums ─────────────────────────────────────────────────── */

export const moodValues = ["happy", "calm", "tired", "anxious", "excited", "low", "focus", "curious"] as const;
export const intentValues = ["want-speak", "want-listen", "has-question"] as const;
export const joinModeValues = ["mic", "text", "listen"] as const;
export const energyValues = ["high", "mid", "low"] as const;
export const sessionStateValues = ["live", "paused", "ended", "archived"] as const;
export const timerStateValues = ["idle", "running", "paused", "done"] as const;

export type Mood = (typeof moodValues)[number];
export type Intent = (typeof intentValues)[number];
export type JoinMode = (typeof joinModeValues)[number];
export type Energy = (typeof energyValues)[number];
export type SessionState = (typeof sessionStateValues)[number];
export type TimerState = (typeof timerStateValues)[number];

/* ── auth ──────────────────────────────────────────────────── */

export type ParticipantAuth = {
  participant_id: string;
  access_key: string;
  session_id?: string;
};

/* ── core records ──────────────────────────────────────────── */

export type ParticipantRecord = {
  participant_id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
  nickname: string;
  mood: Mood;
  intent: Intent;
  join_mode: JoinMode;
  energy: Energy;
  status_text: string;
  hand_raised: boolean;
  cued: boolean;
  is_visible: boolean;
  is_locked: boolean;
  is_deleted: boolean;
  access_key: string;
  last_seen_at: string;
};

export type ParticipantPublicRecord = Omit<ParticipantRecord, "access_key">;

export type SessionRecord = {
  session_id: string;
  name: string;
  state: SessionState;
  stage_id: string;
  activity_title: string;
  current_stage: string;
  current_instruction: string;
  helper_note: string;
  created_at: string;
  ended_at: string | null;
  archived_at: string | null;
  updated_at: string;
  session_date: string;
};

export type TimerRecord = {
  session_id: string;
  state: TimerState;
  total_ms: number;
  // for running timers, server stores set_at (unix ms); client computes remaining
  set_at: number | null;
  // for paused/done timers, server stores the frozen remaining_ms
  remaining_ms: number;
};

export type ChatMessageRecord = {
  message_id: string;
  session_id: string;
  from_id: string;        // participant_id, or "host"
  from_name: string;
  text: string;
  is_host: boolean;
  created_at: string;
};

export type ReactionRecord = {
  reaction_id: string;
  session_id: string;
  target_participant_id: string;
  from_participant_id: string;     // or "host"
  from_name: string;
  emoji: string;
  created_at: string;
};

/* aggregated form sent to clients */
export type ReactionTally = {
  emoji: string;
  count: number;
  mineCount?: number;      // computed per-client
};

export type ParticipantPublicWithReactions = ParticipantPublicRecord & {
  reactions: ReactionTally[];
};

/* ── BoardData payload (what /board polls) ─────────────────── */

export type BoardData = {
  session: SessionRecord;
  timer: TimerRecord;
  participants: ParticipantPublicWithReactions[];
  chat: ChatMessageRecord[];
  reaction_stream: ReactionRecord[];
  // server time for clock skew correction
  now: string;
  // settings
  refresh_seconds: number;
};

/* ── form schemas ──────────────────────────────────────────── */

export const participantFormSchema = z.object({
  nickname: z.string().trim().min(1, "請先輸入暱稱。").max(20, "暱稱最多 20 個字。"),
  mood: z.enum(moodValues),
  intent: z.enum(intentValues),
  join_mode: z.enum(joinModeValues),
  energy: z.enum(energyValues),
  status_text: z.string().trim().max(40, "一句話最多 40 個字。"),
});

export type ParticipantFormValues = z.output<typeof participantFormSchema>;

export const sessionCreateSchema = z.object({
  name: z.string().trim().min(1, "請輸入場次名稱。").max(80),
  activity_title: z.string().trim().max(40).optional(),
  stage_id: z.string().optional(),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const boardStateUpdateSchema = z.object({
  session_id: z.string(),
  current_stage: z.string().max(40).optional(),
  current_instruction: z.string().max(200).optional(),
  helper_note: z.string().max(200).optional(),
  activity_title: z.string().max(40).optional(),
  stage_id: z.string().optional(),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const chatSendSchema = z.object({
  session_id: z.string(),
  text: z.string().trim().min(1).max(200),
  is_host: z.boolean().optional(),
});

export const reactionSendSchema = z.object({
  session_id: z.string(),
  target_participant_id: z.string(),
  emoji: z.string().min(1).max(8),
});

export const timerCmdSchema = z.object({
  session_id: z.string(),
  cmd: z.enum(["start", "pause", "resume", "stop"]),
  seconds: z.number().int().min(5).max(7200).optional(),
});

/* ── labels (for i18n / display) ───────────────────────────── */

export const moodLabels: Record<Mood, { emoji: string; label: string }> = {
  happy:   { emoji: "😊", label: "開心" },
  calm:    { emoji: "🌿", label: "平靜" },
  tired:   { emoji: "🥱", label: "疲憊" },
  anxious: { emoji: "😰", label: "焦慮" },
  excited: { emoji: "🤩", label: "興奮" },
  low:     { emoji: "🌧️", label: "低落" },
  focus:   { emoji: "🎯", label: "專注" },
  curious: { emoji: "🤔", label: "好奇" },
};

export const intentLabels: Record<Intent, { emoji: string; label: string }> = {
  "want-speak":   { emoji: "🗣️", label: "想說話" },
  "want-listen":  { emoji: "👂", label: "想先聽" },
  "has-question": { emoji: "❓", label: "有問題" },
};

export const joinModeLabels: Record<JoinMode, string> = {
  mic: "可以開麥",
  text: "偏好文字",
  listen: "以聽為主",
};

export const energyLabels: Record<Energy, { emoji: string; label: string }> = {
  high: { emoji: "⚡", label: "高能量" },
  mid:  { emoji: "🌤️", label: "中等" },
  low:  { emoji: "🔋", label: "低電量" },
};

export const quickStatusPresets = [
  "選我選我選我！",
  "剛進場",
  "聽到了 ✓",
  "需要再說明一次",
  "通勤中、只能聽",
  "筆記中…",
  "想加碼分享",
  "暫時離開 5 分鐘",
] as const;

export const reactionEmojis = ["👍", "❤️", "🙋", "🎉", "🤝", "💡", "😂", "🙏"] as const;
