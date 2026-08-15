/**
 * ============================================================================
 * contracts/types.ts —— 家長支持平台核心資料契約【CLAUDE 專屬・其他方唯讀】
 * ----------------------------------------------------------------------------
 * 本檔為前後端共用型別的唯一真實來源，對映《系統建置計畫書.md》第五節資料模型
 * 與 00 檔第 5 節摘要。CODEX / ANTIGRAVITY 一律 `import type` 使用，絕不修改。
 * 需要調整介面 → 在交付紀錄提 QUESTION，由 CLAUDE 改版並升 00 檔版號。
 *
 * 命名慣例：
 *  - 所有時間戳為 ISO 8601 字串（Asia/Taipei），欄位以 `At` 結尾。
 *  - 所有 id 為字串（Supabase uuid 或種子資料的語意化 id 如 `rec-001`）。
 * 版本：v1.0（2026-07-11）— 與 00 檔 v1.0 同步。
 * ============================================================================
 */

/* ========================================================================== *
 *  地區
 * ========================================================================== */

/**
 * 18 區正規化清單＋「線上/其他」（推薦資料庫與各專案共用）。
 * v1.1（2026-07-12 CLAUDE 升版）：新增「線上/其他」——實際推薦資料含無實體地區的線上資源。
 */
export type Region =
  | '台北市' | '新北市' | '基隆市' | '桃園市' | '新竹縣市' | '苗栗縣市'
  | '臺中市' | '彰化縣市' | '南投縣' | '雲林縣' | '嘉義縣市' | '臺南市'
  | '高雄市' | '屏東縣' | '宜蘭縣' | '花蓮縣' | '臺東縣' | '澎湖金馬'
  | '線上/其他';

/* ========================================================================== *
 *  使用者、專案與雙層權限
 * ========================================================================== */

/** 登入帳號基本資料（對映 `profiles`）。 */
export interface Profile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  /** 系統最高權限（跨所有專案）。你＝true。 */
  isSystemOwner: boolean;
  createdAt: string;
}

/** 專案類型：課程（多人場次）／會談預約（一對一/少數）。 */
export type ProjectType = 'course' | 'appointment';

/** 專案（對映 `projects`）。每個專案是平行頁面架構、主責人不同。 */
export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  /** 對外公開報名頁的 slug（例：navigator、parent、peer-group）。 */
  slug: string;
  description?: string;
  /** 是否於前台公開報名。 */
  isPublic: boolean;
  createdAt: string;
}

/**
 * 專案內動作權限角色（第二層授權）。每人於不同專案可為不同角色。
 *  - owner：主責人（全部動作）
 *  - admin_collab：行政協作（除個案視設定外全部）
 *  - instructor_full：講師（完整）— 僅自己場次
 *  - instructor_slot：講師（僅時段確認）
 */
export type ProjectRole =
  | 'owner' | 'admin_collab' | 'instructor_full' | 'instructor_slot';

/** 第二層權限：專案內可執行的動作矩陣（RLS 之上的細粒度旗標）。 */
export interface ProjectPermissions {
  /** 報名資料：'all' 全部｜'own_sessions' 僅自己場次｜'none'。 */
  registrations: 'all' | 'own_sessions' | 'none';
  /** 信件收發：'all'｜'own_sessions'｜'none'。 */
  email: 'all' | 'own_sessions' | 'none';
  /** 狀態變更：'all'｜'reply_confirm'（部分：回覆確認）｜'none'。 */
  statusChange: 'all' | 'reply_confirm' | 'none';
  /** 場次管理：全部｜僅勾選可行時段｜無。 */
  sessions: 'all' | 'slot_confirm_only' | 'none';
  /** 個案紀錄可見（視設定）。 */
  cases: boolean;
}

/**
 * 專案成員與角色（對映 `project_members`）。
 * 第一層授權＝這筆存在與否（帳號能看到哪些專案）；第二層＝role / permissions。
 */
export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  /** 未提供時採該 role 的預設矩陣（見 lib/permissions）。 */
  permissions?: Partial<ProjectPermissions>;
  createdAt: string;
}

/* ========================================================================== *
 *  狀態流
 * ========================================================================== */

/** 單一狀態節點。 */
export interface StatusNode {
  /** 穩定機器碼（例：pending、replying、success、waitlist、rejected）。 */
  key: string;
  /** 對外/後台顯示文字（例：待審核）。 */
  label: string;
  /** StatusTag 配色語意。 */
  tone: 'yellow' | 'orange' | 'green' | 'red' | 'blue' | 'gray';
  order: number;
  /** 終態（不可再流轉）。 */
  isTerminal?: boolean;
}

/** 各專案可自訂的狀態流（對映 `status_flows`）。 */
export interface StatusFlow {
  projectId: string;
  nodes: StatusNode[];
  /** 允許的流轉（from key → 可到達的 to key 陣列）；空/未定義代表不限制。 */
  transitions?: Record<string, string[]>;
}

/* ========================================================================== *
 *  動態表單
 * ========================================================================== */

export type FormFieldType =
  | 'text' | 'textarea' | 'email' | 'phone'
  | 'select' | 'multiselect' | 'checkbox'
  /** 單選 chip 群組；語意同 select，但選項全部攤開顯示。 */
  | 'radio'
  /** 可增減的重複群組（例：多位孩子）。答案為物件陣列。 */
  | 'group';

/** 表單選項；`disabled` 用於額滿時段（前台顯示 disabledLabel 且不可勾）。 */
export interface FormFieldOption {
  value: string;
  label: string;
  disabled?: boolean;
  /** 停用時附加顯示（例：「（額滿）」）。 */
  disabledLabel?: string;
  /** 選項下方的小字補充（例：「平日晚間」）。 */
  note?: string;
  /** 分組標題；同一標題的選項會被歸在一起（例：導航計畫的「9 月」）。 */
  group?: string;
  /** 分組標題右側的補充（例：「開放中・報名截止 8/20（四）23:59」）。 */
  groupNote?: string;
}

/** 條件顯示：僅當 `key` 欄位的值命中 `equals` 之一時才顯示與驗證本欄。 */
export interface FormFieldCondition {
  key: string;
  equals: string[];
}

export interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  helpText?: string;
  /** select / multiselect / checkbox / radio 用。可為字串或含停用旗標的物件。 */
  options?: (string | FormFieldOption)[];
  /** 多階段表單的階段編號（1 起算）。未指定視為第 1 階段。 */
  stage?: number;
  /** 條件顯示；不成立時本欄不顯示、不驗證、不送出。 */
  visibleWhen?: FormFieldCondition;
  /** `group` 專用：每一筆的內層欄位。 */
  subFields?: FormField[];
  /** `group` 專用：最少／最多筆數與「新增一筆」按鈕文字。 */
  minItems?: number;
  maxItems?: number;
  addLabel?: string;
  itemLabel?: string;
}

/** 多階段表單的階段標題（對映 SchemaForm 的步驟指示器）。 */
export interface FormStage {
  stage: number;
  title: string;
  /** 顯示在該階段最上方的說明或提醒。 */
  intro?: string;
}

/** 各專案自訂報名欄位定義（對映 `form_schemas`）。 */
export interface FormSchema {
  projectId: string;
  fields: FormField[];
  stages?: FormStage[];
}

/* ========================================================================== *
 *  場次與報名
 * ========================================================================== */

export type SessionStatus = 'open' | 'full' | 'closed' | 'done' | 'cancelled';

/** 活動/諮詢場次（對映 `sessions`）。額滿由 bookedCount ≥ capacity 自動判斷。 */
export interface SessionSlot {
  id: string;
  projectId: string;
  activityId?: string;
  title: string;
  /** ISO 8601, Asia/Taipei。 */
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  status: SessionStatus;
  /** 本場主題；未公布時前台顯示「神秘驚喜！」。 */
  topic?: string;
  /** 本場客座來賓；未公布時前台顯示「神秘驚喜！」。 */
  guest?: string;
  /** 報名截止時間（親職＝前一週 23:59；導航＝前月 20 日 23:59）。 */
  registrationDeadline?: string;
  /** 導航計畫的候選時段（每月 1 位名額，5 個候選共用）。 */
  slotOptions?: { label: string; note?: string; startsAt: string; endsAt: string }[];
  meetUrl?: string;
  /** 指派講師 profile id。 */
  instructorIds: string[];
  /** Google Calendar 事件 id（calendar-upsert 寫入）。 */
  calendarEventId?: string;
}

/** 報名紀錄（對映 `registrations`）。答案結構依該專案 FormSchema。 */
export interface Registration {
  id: string;
  projectId: string;
  /** 報名者勾選/確定的場次 id。 */
  sessionIds: string[];
  /** `group` 型別欄位的答案是物件陣列（例：多位孩子）。 */
  answers: Record<string, string | string[] | Record<string, string | string[]>[]>;
  /** 狀態 key，依該專案 StatusFlow。 */
  status: string;
  email: string;
  createdAt: string;
  updatedAt?: string;
  /** 關聯信件串（若已建立）。 */
  threadId?: string;
  /** 是否有未讀回信（gmail-poll 標記；卡片紅點用）。 */
  hasUnreadReply?: boolean;
}

/* ========================================================================== *
 *  信件（Gmail 整合）
 * ========================================================================== */

/** 一位報名者的往來對話串（對映 `email_threads`）。 */
export interface EmailThread {
  id: string;
  registrationId: string;
  /** Gmail thread id。 */
  gmailThreadId?: string;
  subject: string;
  /** 對方 email。 */
  counterpartEmail: string;
  hasUnread: boolean;
  lastMessageAt?: string;
  createdAt: string;
}

export type EmailDirection = 'outbound' | 'inbound';

/** 單封信件（對映 `email_messages`）。 */
export interface EmailMessage {
  id: string;
  threadId: string;
  direction: EmailDirection;
  from: string;
  to: string;
  subject: string;
  /** 純文字/簡單 HTML 內文。 */
  body: string;
  /** Gmail message id。 */
  gmailMessageId?: string;
  isRead: boolean;
  sentAt: string;
}

/** 信件範本（含變數：{{姓名}}{{場次}}{{Meet連結}}{{時段}}）（對映 `email_templates`）。 */
export interface EmailTemplate {
  id: string;
  /** 全域範本 projectId 省略；專案專屬則填。 */
  projectId?: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
}

/* ========================================================================== *
 *  講師時段邀約
 * ========================================================================== */

export type AvailabilityAnswer = 'yes' | 'no' | 'pending';

/** 一位講師對某候選時段的回覆。 */
export interface AvailabilityReply {
  id: string;
  pollId: string;
  /** 候選時段索引/id（對應 poll.candidateSlots）。 */
  slotId: string;
  instructorId: string;
  answer: AvailabilityAnswer;
  repliedAt?: string;
}

/** 候選時段（尚未成立為 SessionSlot）。 */
export interface CandidateSlot {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
}

/** 講師時段邀約（候選時段 × 講師回覆）（對映 `availability_polls`）。 */
export interface AvailabilityPoll {
  id: string;
  projectId: string;
  candidateSlots: CandidateSlot[];
  /** 受邀講師 profile id。 */
  instructorIds: string[];
  status: 'open' | 'confirmed' | 'cancelled';
  replies: AvailabilityReply[];
  createdAt: string;
}

/* ========================================================================== *
 *  個案管理
 * ========================================================================== */

export type CaseServiceType = 'single' | 'ongoing';
export type CaseStatus = 'active' | 'paused' | 'closed';

/** 個案（對映 `cases`）。真實個資僅存 Supabase，程式碼/種子一律假資料。 */
export interface Case {
  id: string;
  projectId: string;
  /** 關聯報名（可選）。 */
  registrationId?: string;
  /** 個案顯示名/暱稱（種子資料為假名）。 */
  displayName: string;
  serviceType: CaseServiceType;
  status: CaseStatus;
  /** 概況描述。 */
  summary?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ServiceRecordKind = 'service' | 'contact' | 'note';

/** 個案服務/聯繫紀錄（對映 `service_records`）。 */
export interface ServiceRecord {
  id: string;
  caseId: string;
  kind: ServiceRecordKind;
  /** 服務日期時間。 */
  occurredAt: string;
  title: string;
  content: string;
  /** 記錄者 profile id。 */
  authorId?: string;
  createdAt: string;
}

/* ========================================================================== *
 *  就醫推薦資料庫（公開）
 * ========================================================================== */

export type RecommendationCategory =
  | 'doctor' | 'assessment' | 'therapy' | 'community' | 'other';

export type RecommendationAudience = 'child' | 'adult' | 'all';

/** 就醫推薦資料（對映 `recommendations`；公開讀取限 verified=true）。 */
export interface Recommendation {
  id: string;
  category: RecommendationCategory;
  audience: RecommendationAudience;
  region: Region;
  hospital: string;
  doctorOrName: string;
  urls: string[];
  /** 推薦與經驗分享全文（多則以 \n\n 分隔）。 */
  experience: string;
  recommender?: string;
  verified: boolean;
  verifiedNote?: string;
  /** 最後核實日期（ISO date）。 */
  updatedAt?: string;
}

/** 投稿七類型。 */
export type SubmissionType =
  | 'doctor'        // ①醫師推薦
  | 'assessment'    // ②衡鑑/測驗推薦
  | 'therapy'       // ③心理治療/課程/輔助介入推薦
  | 'doctor_update' // ④醫師動態回饋
  | 'feature'       // ⑤專題投稿
  | 'correction'    // ⑥糾錯與反應問題
  | 'other';        // ⑦其他資源

export type SubmissionStatus = 'pending' | 'verified' | 'published' | 'rejected';

/** 推薦投稿（對映 `recommendation_submissions`）。匿名暱稱制，email 選填且永不公開。 */
export interface RecommendationSubmission {
  id: string;
  type: SubmissionType;
  /** 依類型的動態欄位答案。 */
  answers: Record<string, string | string[]>;
  /** 匿名暱稱。 */
  nickname?: string;
  /** 選填、永不公開。 */
  email?: string;
  status: SubmissionStatus;
  /** 糾錯/動態類：疑似對應的既有推薦 id（審核比對用）。 */
  relatedRecommendationId?: string;
  reviewNote?: string;
  createdAt: string;
}

/** 活動回饋（對映 `event_feedback`）。姓名／回饋必填，信箱選填且永不公開。 */
export interface EventFeedback {
  id: string;
  /** 選填：對應的活動／場次名稱。 */
  eventName?: string;
  name: string;
  /** 選填、永不公開。 */
  email?: string;
  message: string;
  createdAt: string;
}

/* ========================================================================== *
 *  內容與稽核
 * ========================================================================== */

/** 入門文章索引（對映內容遷移 articles-index.json）。 */
export interface Article {
  slug: string;
  title: string;
  category: string;
  order: number;
}

/** 講師/夥伴概況。 */
export interface Instructor {
  id: string;
  name: string;
  title: string;
  bio: string;
  avatarUrl?: string;
}

/** 稽核紀錄（對映 `audit_log`）。所有敏感動作與 Google 整合失敗都記這裡。 */
export interface AuditLog {
  id: string;
  /** 動作代碼（例：gmail_send、calendar_upsert、status_change、registration_submit）。 */
  action: string;
  /** 執行者 profile id（系統排程為 null）。 */
  actorId?: string;
  /** 關聯實體類型與 id。 */
  targetType?: string;
  targetId?: string;
  /** 'success' | 'error'。 */
  result: 'success' | 'error';
  detail?: string;
  createdAt: string;
}
