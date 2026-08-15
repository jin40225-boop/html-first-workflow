import {
  AlertCircle,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  DoorOpen,
  Download,
  Expand,
  Hand,
  LoaderCircle,
  MessageCircle,
  MonitorSpeaker,
  RefreshCcw,
  Settings2,
  Sparkles,
  Timer,
  Users,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  type BoardData,
  type ParticipantPublicWithReactions,
  type SessionRecord,
  energyLabels,
  intentLabels,
  joinModeLabels,
  moodLabels,
  reactionEmojis,
} from "../lib/contracts";
import {
  archiveSessionAndCreate,
  clearVisibleParticipants,
  createSession,
  cueParticipant,
  exportSessionCsvUrl,
  getBoardData,
  getApiReadyState,
  sendChat,
  sendReaction,
  timerCmd,
  toggleParticipantLock,
  removeParticipant,
  updateBoardState,
} from "../lib/api";
import { cn, formatDateTime, formatRelativeTime, formatSessionDate, isRecent, todayInputDate } from "../lib/utils";

const stageTemplates = [
  {
    id: "warmup",
    name: "暖身開場",
    instr: "請大家先建立狀態卡片，分享現在的心情和狀態",
    helper: "如剛進場可先看目前進度，再決定是否發言",
  },
  {
    id: "intro",
    name: "成員自介",
    instr: "依舉手順序，每位 1 分鐘分享自己今天的狀態",
    helper: "想聽不想說的，可以用文字回應",
  },
  {
    id: "topic",
    name: "主題討論",
    instr: "現在主題：本月最有感的工作經驗",
    helper: "有想說的請按想說話，主持人會依序 cue 發言",
  },
  {
    id: "checkout",
    name: "結束 check-out",
    instr: "用一個詞描述現在的狀態，依序送出狀態卡",
    helper: "今天辛苦了",
  },
] as const;

export function BoardPage() {
  const [searchParams] = useSearchParams();
  const adminMode = searchParams.get("admin") === "1";
  const apiReady = getApiReadyState();

  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(adminMode);
  const [adminToken, setAdminToken] = useState("");
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [hostChatText, setHostChatText] = useState("");
  const [newSessionName, setNewSessionName] = useState("");
  const [newSessionDate, setNewSessionDate] = useState(() => todayInputDate());
  const [selectedParticipant, setSelectedParticipant] =
    useState<ParticipantPublicWithReactions | null>(null);
  const [changedIds, setChangedIds] = useState<string[]>([]);

  const previousUpdatedMapRef = useRef<Map<string, string>>(new Map());
  const changedTimeoutsRef = useRef<number[]>([]);

  function clearChangeTimeouts() {
    changedTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
    changedTimeoutsRef.current = [];
  }

  useEffect(() => clearChangeTimeouts, []);

  const loadBoard = useCallback(
    async (quiet: boolean) => {
      if (!apiReady) {
        setIsLoading(false);
        setLoadError("尚未設定 Apps Script API URL。");
        return;
      }

      if (quiet) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const payload = await getBoardData();
        const previousMap = previousUpdatedMapRef.current;
        const nextMap = new Map<string, string>();
        const nextChangedIds: string[] = [];

        payload.participants.forEach((participant) => {
          nextMap.set(participant.participant_id, participant.updated_at);
          const previousUpdatedAt = previousMap.get(participant.participant_id);
          if (previousUpdatedAt && previousUpdatedAt !== participant.updated_at) {
            nextChangedIds.push(participant.participant_id);
          }
        });

        previousUpdatedMapRef.current = nextMap;
        setBoardData(payload);
        setLoadError(null);

        if (nextChangedIds.length > 0) {
          setChangedIds((current) => Array.from(new Set([...current, ...nextChangedIds])));
          const timeout = window.setTimeout(() => {
            setChangedIds((current) =>
              current.filter((participantId) => !nextChangedIds.includes(participantId)),
            );
          }, 4200);
          changedTimeoutsRef.current.push(timeout);
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "無法載入目前板子資料，請稍後再試。");
      } finally {
        if (quiet) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [apiReady],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBoard(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadBoard]);

  useEffect(() => {
    const refreshSeconds = Math.max(boardData?.refresh_seconds ?? 5, 3);
    const timer = window.setInterval(() => {
      void loadBoard(true);
    }, refreshSeconds * 1000);

    return () => window.clearInterval(timer);
  }, [boardData?.refresh_seconds, loadBoard]);

  const visibleParticipants = useMemo(
    () =>
      [...(boardData?.participants ?? [])]
        .filter((participant) => participant.is_visible && !participant.is_deleted)
        .sort((left, right) => {
          if (left.cued !== right.cued) return left.cued ? -1 : 1;
          if (left.hand_raised !== right.hand_raised) return left.hand_raised ? -1 : 1;
          return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
        }),
    [boardData?.participants],
  );

  const stats = useMemo(
    () => ({
      total: visibleParticipants.length,
      wantSpeak: visibleParticipants.filter((participant) => participant.intent === "want-speak").length,
      wantListen: visibleParticipants.filter((participant) => participant.intent === "want-listen").length,
      hasQuestion: visibleParticipants.filter((participant) => participant.intent === "has-question").length,
      handRaised: visibleParticipants.filter((participant) => participant.hand_raised).length,
      reactions: visibleParticipants.reduce(
        (sum, participant) =>
          sum + participant.reactions.reduce((innerSum, reaction) => innerSum + reaction.count, 0),
        0,
      ),
    }),
    [visibleParticipants],
  );

  async function runAdminAction(action: () => Promise<unknown>, successMessage: string) {
    if (!adminToken.trim()) {
      setAdminError("請先輸入 admin token。");
      return;
    }

    setAdminMessage(null);
    setAdminError(null);

    try {
      await action();
      setAdminMessage(successMessage);
      await loadBoard(true);
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "主持控制操作失敗。");
    }
  }

  async function handleSaveSession(next: Partial<SessionRecord>) {
    if (!boardData) return;
    await runAdminAction(
      () =>
        updateBoardState(adminToken.trim(), {
          session_id: boardData.session.session_id,
          ...next,
        }),
      "場次資訊已更新。",
    );
  }

  async function handleStage(stageId: string) {
    const stage = stageTemplates.find((item) => item.id === stageId);
    if (!boardData || !stage) return;

    await handleSaveSession({
      stage_id: stage.id,
      current_stage: stage.name,
      current_instruction: stage.instr,
      helper_note: stage.helper,
    });
  }

  async function handleHostChat() {
    if (!boardData || !hostChatText.trim()) return;

    await runAdminAction(
      () =>
        sendChat({
          session_id: boardData.session.session_id,
          text: hostChatText.trim(),
          admin_token: adminToken.trim(),
        }),
      "主持訊息已送出。",
    );
    setHostChatText("");
  }

  async function handleReaction(participant: ParticipantPublicWithReactions, emoji: string) {
    if (!boardData) return;

    await runAdminAction(
      () =>
        sendReaction({
          session_id: boardData.session.session_id,
          target_participant_id: participant.participant_id,
          emoji,
          admin_token: adminToken.trim(),
        }),
      `已對 ${participant.nickname} 加上 ${emoji}`,
    );
  }

  const timerText = boardData ? getTimerText(boardData) : null;

  return (
    <>
      <section className="space-y-6">
        <div className="board-hero overflow-hidden px-6 py-7 sm:px-8 sm:py-9">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(255,248,240,0.9)] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#8e715c] shadow-[0_12px_30px_rgba(95,69,49,0.08)] ring-1 ring-[rgba(231,217,203,0.94)]">
                <MonitorSpeaker className="h-4 w-4" />
                Board / 投影主畫面
              </div>
              <p className="mt-5 text-sm font-bold uppercase tracking-[0.24em] text-[#9b7c67]">
                {boardData?.session.activity_title ?? "活動同步狀態板"}
              </p>
              <h2 className="font-display mt-3 text-[2.5rem] font-black leading-[0.98] tracking-[-0.04em] text-stone-900 sm:text-[3.8rem] xl:text-[4.8rem]">
                {boardData?.session.current_stage ?? "載入中"}
              </h2>
              <p className="mt-5 max-w-5xl text-[1.2rem] font-semibold leading-8 text-stone-700 sm:text-[1.45rem] sm:leading-10">
                {boardData?.session.current_instruction ?? "正在同步活動資料..."}
              </p>
              {boardData?.session.helper_note ? (
                <p className="mt-4 max-w-4xl text-sm leading-7 text-stone-500 sm:text-base">
                  提醒：{boardData.session.helper_note}
                </p>
              ) : null}
            </div>

            <div className="grid min-w-[220px] gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <MetricPill label="目前人數" value={String(stats.total)} />
              <MetricPill label="自動刷新" value={`${boardData?.refresh_seconds ?? 5}s`} />
              {timerText ? <MetricPill label={timerText.label} value={timerText.value} tone={timerText.tone} /> : null}
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 border-t border-[rgba(224,208,192,0.8)] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
              <span className="rounded-full bg-[rgba(247,240,232,0.92)] px-3 py-1.5">
                場次：{boardData?.session.name ?? "讀取中"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(255,253,249,0.9)] px-3 py-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatSessionDate(boardData?.session.session_date ?? "")}
              </span>
              <span className="rounded-full bg-[rgba(255,253,249,0.9)] px-3 py-1.5">
                最後同步：{formatDateTime(boardData?.now ?? "")}
              </span>
              <span className="rounded-full bg-[rgba(243,238,247,0.92)] px-3 py-1.5 text-[#6c5e81]">
                點卡片可放大查看
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="secondary-button inline-flex items-center gap-2 px-4 py-3 text-sm font-bold"
                onClick={() => void loadBoard(true)}
                disabled={isRefreshing || isLoading}
              >
                {isRefreshing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                手動刷新
              </button>

              <Link
                to="/join"
                className="secondary-button inline-flex items-center gap-2 px-4 py-3 text-sm font-bold"
              >
                <DoorOpen className="h-4 w-4" />
                學員填寫頁
              </Link>

              {adminMode ? (
                <button
                  type="button"
                  className="primary-button inline-flex items-center gap-2 px-4 py-3 text-sm font-bold"
                  onClick={() => setDrawerOpen((open) => !open)}
                >
                  <Settings2 className="h-4 w-4" />
                  {drawerOpen ? "收起主持控制" : "打開主持控制"}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard label="總到場" value={stats.total} tone="brand" />
          <StatCard label="想說話" value={stats.wantSpeak} tone="brand" />
          <StatCard label="想先聽" value={stats.wantListen} tone="info" />
          <StatCard label="有問題" value={stats.hasQuestion} tone="warn" />
          <StatCard label="舉手中" value={stats.handRaised} tone="warn" />
          <StatCard label="反應數" value={stats.reactions} tone="success" />
        </div>

        {loadError ? (
          <div className="soft-panel flex items-start gap-3 border border-[#efceb7] bg-[#fff4ec] px-5 py-4 text-sm leading-6 text-[#9a5835]">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{loadError}</span>
          </div>
        ) : null}

        {isLoading ? (
          <div className="soft-panel flex min-h-64 items-center justify-center px-6 py-12">
            <div className="inline-flex items-center gap-3 rounded-full bg-[#fbf4ec] px-5 py-3 text-stone-600">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              正在載入活動狀態板
            </div>
          </div>
        ) : visibleParticipants.length > 0 ? (
          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
              {visibleParticipants.map((participant) => (
                <ParticipantCard
                  key={participant.participant_id}
                  participant={participant}
                  isNew={isRecent(participant.created_at, 60)}
                  isChanged={changedIds.includes(participant.participant_id)}
                  canReact={adminMode}
                  onOpen={() => setSelectedParticipant(participant)}
                  onReact={(emoji) => void handleReaction(participant, emoji)}
                />
              ))}
            </div>
            <SideActivityPanel boardData={boardData} />
          </div>
        ) : (
          <div className="soft-panel px-6 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#fff1e3] text-[#c17046]">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-2xl font-black tracking-[-0.03em] text-stone-900">
              目前還沒有學員卡片
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-stone-600">
              只要第一位學員在 `/join` 建立卡片，這裡就會依 cue、舉手與更新時間排序顯示。
            </p>
          </div>
        )}
      </section>

      {selectedParticipant ? (
        <ParticipantDialog
          participant={selectedParticipant}
          onClose={() => setSelectedParticipant(null)}
        />
      ) : null}

      {adminMode && drawerOpen && boardData ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-[rgba(38,28,19,0.18)] backdrop-blur-[2px]">
          <div className="drawer-enter h-full w-full max-w-2xl overflow-y-auto border-l border-[#eadfd3] bg-[#fffaf6] px-5 py-5 shadow-[-20px_0_60px_rgba(71,49,34,0.16)] sm:px-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#9a7f68]">
                  Admin Drawer
                </p>
                <h3 className="mt-2 text-2xl font-black tracking-[-0.03em] text-stone-900">
                  主持控制抽屜
                </h3>
                <p className="mt-2 text-sm leading-7 text-stone-600">
                  控制目前場次、階段、計時器、cue 發言與場次資料。
                </p>
              </div>
              <button
                type="button"
                className="secondary-button inline-flex items-center gap-1 px-3 py-2 text-sm font-bold"
                onClick={() => setDrawerOpen(false)}
              >
                <ChevronRight className="h-4 w-4" />
                收起
              </button>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-stone-700">Admin token</span>
                <input
                  className="soft-input"
                  type="password"
                  placeholder="只在主持控制時手動輸入，不放在前端設定檔"
                  value={adminToken}
                  onChange={(event) => setAdminToken(event.target.value)}
                />
              </label>

              {adminError ? <AlertBox tone="error">{adminError}</AlertBox> : null}
              {adminMessage ? <AlertBox tone="success">{adminMessage}</AlertBox> : null}

              <AdminSection title="階段腳本">
                <div className="grid gap-3 sm:grid-cols-2">
                  {stageTemplates.map((stage) => (
                    <button
                      key={stage.id}
                      type="button"
                      data-active={boardData.session.stage_id === stage.id}
                      className="chip-button flex flex-col items-start rounded-[22px] px-4 py-3 text-left"
                      onClick={() => void handleStage(stage.id)}
                    >
                      <span className="font-black">{stage.name}</span>
                      <span className="mt-1 text-xs text-stone-500">{stage.instr}</span>
                    </button>
                  ))}
                </div>
              </AdminSection>

              <AdminSection title="即時上稿">
                <SessionDraftForm
                  key={`${boardData.session.session_id}:${boardData.session.updated_at}`}
                  session={boardData.session}
                  onSave={handleSaveSession}
                />
              </AdminSection>

              <AdminSection title="計時器">
                <div className="flex flex-wrap items-center gap-2">
                  {[60, 180, 300, 600].map((seconds) => (
                    <button
                      key={seconds}
                      type="button"
                      className="secondary-button inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold"
                      onClick={() =>
                        void runAdminAction(
                          () => timerCmd(adminToken.trim(), { session_id: boardData.session.session_id, cmd: "start", seconds }),
                          `已開始 ${Math.floor(seconds / 60)} 分鐘計時。`,
                        )
                      }
                    >
                      <Timer className="h-4 w-4" />
                      {Math.floor(seconds / 60)} 分
                    </button>
                  ))}
                  {(["pause", "resume", "stop"] as const).map((cmd) => (
                    <button
                      key={cmd}
                      type="button"
                      className="secondary-button px-4 py-2.5 text-sm font-bold"
                      onClick={() =>
                        void runAdminAction(
                          () => timerCmd(adminToken.trim(), { session_id: boardData.session.session_id, cmd }),
                          "計時器已更新。",
                        )
                      }
                    >
                      {cmd === "pause" ? "暫停" : cmd === "resume" ? "繼續" : "停止"}
                    </button>
                  ))}
                </div>
              </AdminSection>

              <AdminSection title="成員控制">
                <div className="space-y-2">
                  {visibleParticipants.map((participant) => (
                    <div
                      key={participant.participant_id}
                      className="grid gap-3 rounded-[20px] border border-[#eadfd3] bg-white px-4 py-3 sm:grid-cols-[1fr_auto]"
                    >
                      <div className="min-w-0">
                        <p className="font-black text-stone-900">
                          {participant.nickname}
                          {participant.hand_raised ? <span className="ml-2 text-[#a26524]">舉手中</span> : null}
                          {participant.cued ? <span className="ml-2 text-[#c5613f]">Cue 中</span> : null}
                        </p>
                        <p className="mt-1 truncate text-sm text-stone-500">
                          {intentLabels[participant.intent].emoji} {intentLabels[participant.intent].label} · {participant.status_text || "尚未填寫狀態"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="secondary-button px-3 py-2 text-sm font-bold"
                          onClick={() =>
                            void runAdminAction(
                              () =>
                                cueParticipant(
                                  adminToken.trim(),
                                  boardData.session.session_id,
                                  participant.cued ? null : participant.participant_id,
                                ),
                              participant.cued ? "已取消 cue。" : `已 cue ${participant.nickname}。`,
                            )
                          }
                        >
                          {participant.cued ? "取消 Cue" : "Cue"}
                        </button>
                        <button
                          type="button"
                          className="secondary-button px-3 py-2 text-sm font-bold"
                          onClick={() =>
                            void runAdminAction(
                              () =>
                                toggleParticipantLock(
                                  adminToken.trim(),
                                  participant.participant_id,
                                  !participant.is_locked,
                                ),
                              participant.is_locked ? "已解鎖成員。" : "已鎖定成員。",
                            )
                          }
                        >
                          {participant.is_locked ? "解鎖" : "鎖定"}
                        </button>
                        <button
                          type="button"
                          className="secondary-button px-3 py-2 text-sm font-bold text-[#a45240]"
                          onClick={() =>
                            void runAdminAction(
                              () => removeParticipant(adminToken.trim(), participant.participant_id),
                              "已移出成員。",
                            )
                          }
                        >
                          移出
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </AdminSection>

              <AdminSection title="主持訊息">
                <div className="flex gap-2">
                  <input
                    className="soft-input"
                    placeholder="送到聊天牆的主持訊息"
                    value={hostChatText}
                    onChange={(event) => setHostChatText(event.target.value)}
                  />
                  <button
                    type="button"
                    className="primary-button shrink-0 px-5 py-3 font-bold"
                    onClick={() => void handleHostChat()}
                  >
                    送出
                  </button>
                </div>
              </AdminSection>

              <AdminSection title="場次管理">
                <div className="flex flex-col gap-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_12rem_auto]">
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold text-stone-500">場次名稱</span>
                      <input
                        className="soft-input"
                        placeholder="例如：5/23 家庭支持小組"
                        value={newSessionName}
                        onChange={(event) => setNewSessionName(event.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold text-stone-500">活動日期</span>
                      <input
                        className="soft-input"
                        type="date"
                        value={newSessionDate}
                        onChange={(event) => setNewSessionDate(event.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="primary-button inline-flex items-center justify-center gap-2 px-5 py-3 font-bold sm:self-end"
                      onClick={() =>
                        void runAdminAction(
                          () =>
                            createSession(
                              adminToken.trim(),
                              newSessionName.trim() || `${new Date().getMonth() + 1}/${new Date().getDate()} 新場次`,
                              { session_date: newSessionDate },
                            ),
                          "已建立新場次。",
                        )
                      }
                    >
                      <CalendarDays className="h-4 w-4" />
                      開新場次
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="secondary-button px-4 py-2.5 text-sm font-bold text-[#a45240]"
                      onClick={() =>
                        void runAdminAction(
                          () => clearVisibleParticipants(adminToken.trim(), boardData.session.session_id),
                          "已清空本場成員。",
                        )
                      }
                    >
                      清空本場成員
                    </button>
                    <button
                      type="button"
                      className="secondary-button px-4 py-2.5 text-sm font-bold"
                      onClick={() => {
                        if (!window.confirm("確定要封存目前場次並開啟新場次嗎？舊資料會保留在後台，但不再顯示於公開看板。")) {
                          return;
                        }
                        void runAdminAction(
                          () =>
                            archiveSessionAndCreate(
                              adminToken.trim(),
                              boardData.session.session_id,
                              newSessionName.trim() || `${newSessionDate} 活動場次`,
                              { session_date: newSessionDate },
                            ),
                          "舊場次已封存，新場次已開啟。",
                        );
                      }}
                    >
                      封存舊場並開新場
                    </button>
                    <a
                      className="secondary-button inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold"
                      href={adminToken.trim() ? exportSessionCsvUrl(boardData.session.session_id, adminToken.trim()) : undefined}
                    >
                      <Download className="h-4 w-4" />
                      匯出 CSV
                    </a>
                  </div>
                </div>
              </AdminSection>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MetricPill({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "warn" | "danger" }) {
  return (
    <div
      className={cn(
        "rounded-[24px] bg-[rgba(255,247,238,0.96)] px-5 py-4 shadow-[0_10px_24px_rgba(95,69,49,0.08)]",
        tone === "warn" && "bg-[#fff1df] text-[#8c560f]",
        tone === "danger" && "bg-[#fff0ea] text-[#a83a2c]",
      )}
    >
      <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-stone-900">{value}</p>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "brand" | "info" | "warn" | "success" }) {
  const toneClass = {
    brand: "bg-[#fff3e7] text-[#a85e3b]",
    info: "bg-[#eef7fb] text-[#3e7aa3]",
    warn: "bg-[#fff1df] text-[#9a611f]",
    success: "bg-[#ecf7ef] text-[#357341]",
  }[tone];

  return (
    <div className="soft-panel px-5 py-4">
      <p className="text-sm font-bold text-stone-500">{label}</p>
      <p className={cn("mt-2 inline-flex rounded-full px-4 py-1 text-3xl font-black", toneClass)}>
        {value}
      </p>
    </div>
  );
}

function ParticipantCard({
  participant,
  isNew,
  isChanged,
  canReact,
  onOpen,
  onReact,
}: {
  participant: ParticipantPublicWithReactions;
  isNew: boolean;
  isChanged: boolean;
  canReact: boolean;
  onOpen: () => void;
  onReact: (emoji: string) => void;
}) {
  const mood = moodLabels[participant.mood];
  const intent = intentLabels[participant.intent];
  const energy = energyLabels[participant.energy];

  return (
    <button
      type="button"
      className={cn(
        "soft-panel relative min-h-64 overflow-hidden px-5 py-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(141,95,61,0.12)]",
        participant.hand_raised && "ring-2 ring-[#e89545]/70",
        participant.cued && "ring-2 ring-[#d97757]/80",
        isNew && "status-card-new",
        isChanged && "status-card-updated",
      )}
      onClick={onOpen}
    >
      <div className="absolute right-4 top-4 flex flex-wrap items-center justify-end gap-2">
        {participant.cued ? <Flag label="CUE" tone="dark" /> : null}
        {participant.hand_raised ? <Flag label="舉手" tone="warn" icon={<Hand className="h-3.5 w-3.5" />} /> : null}
        {isNew ? <Flag label="NEW" tone="brand" /> : null}
      </div>

      <div className="pr-24">
        <h3 className="text-[1.65rem] font-black tracking-[-0.03em] text-stone-900">
          {participant.nickname}
        </h3>
        <p className="mt-1 text-sm text-stone-500">{formatRelativeTime(participant.updated_at)}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>{mood.emoji} {mood.label}</Badge>
        <Badge tone={participant.intent === "want-speak" ? "brand" : participant.intent === "has-question" ? "warn" : "info"}>
          {intent.emoji} {intent.label}
        </Badge>
        <Badge>{joinModeLabels[participant.join_mode]}</Badge>
        <Badge>{energy.emoji} {energy.label}</Badge>
      </div>

      <p className="mt-4 rounded-[22px] bg-[#fff8f1] px-4 py-4 text-lg font-semibold leading-7 text-[#584339]">
        {participant.status_text || "目前沒有填寫即時狀態"}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {participant.reactions.length > 0 ? (
          participant.reactions.map((reaction) => (
            <span
              key={reaction.emoji}
              className="rounded-full bg-white/80 px-3 py-1.5 text-sm font-black text-stone-700 shadow-[inset_0_0_0_1px_rgba(232,218,204,0.92)]"
            >
              {reaction.emoji} {reaction.count}
            </span>
          ))
        ) : (
          <span className="text-sm text-stone-400">尚無反應</span>
        )}
      </div>

      {canReact ? (
        <div className="mt-4 flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
          {reactionEmojis.slice(0, 6).map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="rounded-full bg-white/85 px-2.5 py-1 text-sm shadow-[inset_0_0_0_1px_rgba(232,218,204,0.92)] transition hover:bg-[#fff1e6]"
              onClick={() => onReact(emoji)}
              aria-label={`加上 ${emoji} 反應`}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-stone-600 shadow-[inset_0_0_0_1px_rgba(232,218,204,0.92)]">
        <Expand className="h-3.5 w-3.5" />
        點擊放大查看
      </div>
    </button>
  );
}

function SideActivityPanel({ boardData }: { boardData: BoardData | null }) {
  return (
    <aside className="space-y-4">
      <div className="soft-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#eee0d0] bg-[#fff8ef] px-5 py-4">
          <h3 className="inline-flex items-center gap-2 font-black text-stone-900">
            <MessageCircle className="h-4 w-4" />
            聊天牆
          </h3>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-stone-500">
            {boardData?.chat.length ?? 0} 則
          </span>
        </div>
        <div className="max-h-80 space-y-3 overflow-y-auto px-5 py-4">
          {boardData?.chat.length ? (
            boardData.chat.slice(-8).map((message) => (
              <div key={message.message_id} className="flex gap-3">
                <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#fff1e3] text-xs font-black text-[#bc6e44]", message.is_host && "bg-[#2d251a] text-white")}>
                  {message.is_host ? "主" : message.from_name.slice(-2)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-stone-500">
                    {message.from_name} · {formatRelativeTime(message.created_at)}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-stone-800">{message.text}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-stone-400">還沒有訊息</p>
          )}
        </div>
      </div>

      <div className="soft-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#eee0d0] bg-[#fff8ef] px-5 py-4">
          <h3 className="inline-flex items-center gap-2 font-black text-stone-900">
            <Sparkles className="h-4 w-4" />
            即時反應
          </h3>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-stone-500">
            {boardData?.reaction_stream.length ?? 0}
          </span>
        </div>
        <div className="max-h-64 space-y-2 overflow-y-auto px-5 py-4">
          {boardData?.reaction_stream.length ? (
            boardData.reaction_stream.slice(0, 10).map((reaction) => (
              <div
                key={reaction.reaction_id}
                className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-stone-700 shadow-[inset_0_0_0_1px_rgba(232,218,204,0.92)]"
              >
                <span className="text-lg">{reaction.emoji}</span>
                <span className="font-bold">{reaction.from_name}</span>
                <span className="text-stone-400">→</span>
                <span className="truncate">{reaction.target_participant_id}</span>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-stone-400">還沒有反應</p>
          )}
        </div>
      </div>
    </aside>
  );
}

function ParticipantDialog({
  participant,
  onClose,
}: {
  participant: ParticipantPublicWithReactions;
  onClose: () => void;
}) {
  const mood = moodLabels[participant.mood];
  const intent = intentLabels[participant.intent];
  const energy = energyLabels[participant.energy];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(33,24,18,0.46)] px-4 py-6 backdrop-blur-sm">
      <div className="soft-panel max-h-[92vh] w-full max-w-3xl overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{mood.emoji} {mood.label}</Badge>
              <Badge tone="brand">{intent.emoji} {intent.label}</Badge>
              <Badge>{joinModeLabels[participant.join_mode]}</Badge>
              <Badge>{energy.emoji} {energy.label}</Badge>
              {participant.hand_raised ? <Badge tone="warn">舉手中</Badge> : null}
              {participant.cued ? <Badge tone="brand">Cue 中</Badge> : null}
              {participant.is_locked ? <Badge tone="danger">已鎖定</Badge> : null}
            </div>
            <h3 className="mt-4 text-[2rem] font-black tracking-[-0.04em] text-stone-900 sm:text-[2.5rem]">
              {participant.nickname}
            </h3>
            <p className="mt-2 text-sm text-stone-500">
              {formatRelativeTime(participant.updated_at)} · {formatDateTime(participant.updated_at)}
            </p>
          </div>

          <button
            type="button"
            className="secondary-button inline-flex items-center gap-2 px-3 py-2 text-sm font-bold"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            關閉
          </button>
        </div>

        <div className="mt-6 rounded-[24px] bg-[#fff8f1] px-5 py-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#9d7a60]">
            即時狀態
          </p>
          <p className="mt-3 text-2xl font-black leading-9 text-[#5a4337]">
            {participant.status_text || "目前沒有填寫即時狀態"}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {participant.reactions.length ? (
            participant.reactions.map((reaction) => (
              <Badge key={reaction.emoji} tone="success">
                {reaction.emoji} {reaction.count}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-stone-400">尚無反應</span>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionDraftForm({
  session,
  onSave,
}: {
  session: SessionRecord;
  onSave: (next: Partial<SessionRecord>) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    name: session.name,
    activity_title: session.activity_title,
    current_stage: session.current_stage,
    current_instruction: session.current_instruction,
    helper_note: session.helper_note,
    session_date: session.session_date || todayInputDate(),
  });

  return (
    <div className="space-y-3">
      <input
        className="soft-input"
        value={draft.name}
        onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
        placeholder="場次名稱"
      />
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-stone-700">活動日期</span>
        <input
          className="soft-input"
          type="date"
          value={draft.session_date}
          onChange={(event) => setDraft((current) => ({ ...current, session_date: event.target.value }))}
        />
      </label>
      <input
        className="soft-input"
        value={draft.activity_title}
        onChange={(event) => setDraft((current) => ({ ...current, activity_title: event.target.value }))}
        placeholder="活動標題"
      />
      <input
        className="soft-input"
        value={draft.current_stage}
        onChange={(event) => setDraft((current) => ({ ...current, current_stage: event.target.value }))}
        placeholder="目前階段"
      />
      <textarea
        className="soft-input min-h-24 resize-y"
        value={draft.current_instruction}
        onChange={(event) => setDraft((current) => ({ ...current, current_instruction: event.target.value }))}
        placeholder="主持指令"
      />
      <textarea
        className="soft-input min-h-20 resize-y"
        value={draft.helper_note}
        onChange={(event) => setDraft((current) => ({ ...current, helper_note: event.target.value }))}
        placeholder="輔助提示"
      />
      <div className="flex justify-end">
        <button
          type="button"
          className="primary-button inline-flex items-center gap-2 px-5 py-3 font-bold"
          onClick={() => void onSave(draft)}
        >
          <CheckCheck className="h-4 w-4" />
          即時上稿
        </button>
      </div>
    </div>
  );
}

function AdminSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-[#eadfd3] bg-white/86 px-4 py-4">
      <h4 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-[#8a725e]">
        {title}
      </h4>
      {children}
    </section>
  );
}

function AlertBox({ tone, children }: { tone: "success" | "error"; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-[22px] px-4 py-4 text-sm leading-6",
        tone === "success" ? "bg-[#eef7ef] text-[#44694f]" : "bg-[#fff0e9] text-[#a55140]",
      )}
    >
      {children}
    </div>
  );
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "brand" | "info" | "warn" | "success" | "danger" }) {
  const className = {
    neutral: "bg-[#f7efe8] text-stone-700",
    brand: "bg-[#fff1e6] text-[#b76540]",
    info: "bg-[#eef7fb] text-[#3e7aa3]",
    warn: "bg-[#fff1df] text-[#9a611f]",
    success: "bg-[#ecf7ef] text-[#357341]",
    danger: "bg-[#fff0ea] text-[#a83a2c]",
  }[tone];
  return <span className={cn("rounded-full px-3 py-1.5 text-sm font-semibold", className)}>{children}</span>;
}

function Flag({ label, tone, icon }: { label: string; tone: "brand" | "warn" | "dark"; icon?: ReactNode }) {
  const className = {
    brand: "bg-[#d97757] text-white",
    warn: "bg-[#e89545] text-white",
    dark: "bg-[#2d251a] text-white",
  }[tone];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black", className)}>
      {icon}
      {label}
    </span>
  );
}

function getTimerText(boardData: BoardData) {
  const timer = boardData.timer;
  if (timer.state === "idle") return null;

  let remainingMs = timer.remaining_ms;
  if (timer.state === "running" && timer.set_at) {
    remainingMs = Math.max(0, timer.total_ms - (Date.now() - timer.set_at));
  }

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const value = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  if (timer.state === "done") return { label: "時間到", value, tone: "danger" as const };
  if (timer.state === "paused") return { label: "暫停中", value, tone: "warn" as const };
  return { label: "本段剩餘", value, tone: remainingMs < 30000 ? ("warn" as const) : ("neutral" as const) };
}
