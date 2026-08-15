import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  BadgeCheck,
  Hand,
  LoaderCircle,
  MonitorSpeaker,
  RefreshCcw,
  Smartphone,
  Sparkles,
} from "lucide-react";
import {
  type Energy,
  type Intent,
  type JoinMode,
  type Mood,
  type ParticipantFormValues,
  type ParticipantRecord,
  energyLabels,
  energyValues,
  intentLabels,
  intentValues,
  joinModeLabels,
  joinModeValues,
  moodLabels,
  moodValues,
  participantFormSchema,
  quickStatusPresets,
} from "../lib/contracts";
import { createParticipant, getApiReadyState, getParticipantById, toggleHand, updateParticipant } from "../lib/api";
import { clearParticipantAuth, loadParticipantAuth, saveParticipantAuth } from "../lib/storage";
import { cn, formatDateTime } from "../lib/utils";

type FieldErrors = Partial<Record<keyof ParticipantFormValues, string>>;

const defaultFormValues: ParticipantFormValues = {
  nickname: "",
  mood: "calm",
  intent: "want-listen",
  join_mode: "mic",
  energy: "mid",
  status_text: "",
};

function pickFormValues(participant: ParticipantRecord): ParticipantFormValues {
  return {
    nickname: participant.nickname,
    mood: participant.mood,
    intent: participant.intent,
    join_mode: participant.join_mode,
    energy: participant.energy,
    status_text: participant.status_text,
  };
}

export function JoinPage() {
  const [savedAuth] = useState(() => loadParticipantAuth());
  const [formValues, setFormValues] = useState<ParticipantFormValues>(defaultFormValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [participant, setParticipant] = useState<ParticipantRecord | null>(null);
  const [isHydrating, setIsHydrating] = useState(() => Boolean(savedAuth));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHandSubmitting, setIsHandSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const apiReady = getApiReadyState();
  const hasExistingIdentity = Boolean(participant?.participant_id);

  useEffect(() => {
    let cancelled = false;

    if (!savedAuth) {
      return;
    }

    void getParticipantById(savedAuth)
      .then((savedParticipant) => {
        if (cancelled) {
          return;
        }

        setParticipant(savedParticipant);
        setFormValues(pickFormValues(savedParticipant));
      })
      .catch(() => {
        clearParticipantAuth();
        if (!cancelled) {
          setSubmitError("這台裝置原本的卡片已不符合新版資料結構，已切回新加入模式。");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsHydrating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [savedAuth]);

  const livePreview = useMemo(() => {
    const mood = moodLabels[formValues.mood];
    const intent = intentLabels[formValues.intent];
    const energy = energyLabels[formValues.energy];
    return {
      mood: `${mood.emoji} ${mood.label}`,
      intent: `${intent.emoji} ${intent.label}`,
      joinMode: joinModeLabels[formValues.join_mode],
      energy: `${energy.emoji} ${energy.label}`,
    };
  }, [formValues]);

  function updateField<K extends keyof ParticipantFormValues>(
    key: K,
    value: ParticipantFormValues[K],
  ) {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }));
    setFieldErrors((current) => ({
      ...current,
      [key]: undefined,
    }));
    setSubmitMessage(null);
    setSubmitError(null);
  }

  function validateForm() {
    const parsed = participantFormSchema.safeParse(formValues);

    if (parsed.success) {
      setFieldErrors({});
      return parsed.data;
    }

    const nextErrors: FieldErrors = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0] as keyof ParticipantFormValues | undefined;
      if (key && !nextErrors[key]) {
        nextErrors[key] = issue.message;
      }
    });
    setFieldErrors(nextErrors);
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitMessage(null);
    setSubmitError(null);

    if (!apiReady) {
      setSubmitError("尚未設定 Apps Script API URL，請先完成 .env 與新版後端部署。");
      return;
    }

    const parsed = validateForm();
    if (!parsed) {
      setSubmitError("請先補完上方欄位，再送出卡片。");
      return;
    }

    setIsSubmitting(true);

    try {
      if (participant) {
        const updatedParticipant = await updateParticipant(
          {
            participant_id: participant.participant_id,
            access_key: participant.access_key,
          },
          parsed,
        );
        setParticipant(updatedParticipant);
        setFormValues(pickFormValues(updatedParticipant));
        setSubmitMessage("狀態已同步到投影板。");
      } else {
        const created = await createParticipant(parsed);
        saveParticipantAuth(created.auth);
        setParticipant(created.participant);
        setFormValues(pickFormValues(created.participant));
        setSubmitMessage("已建立狀態卡，之後回來這台裝置會自動認出你。");
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "送出失敗，請稍後再試一次。");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleHand() {
    setSubmitMessage(null);
    setSubmitError(null);

    if (!participant) {
      setSubmitError("請先建立卡片，之後才能舉手或放下。");
      return;
    }

    setIsHandSubmitting(true);
    try {
      const updatedParticipant = await toggleHand({
        participant_id: participant.participant_id,
        access_key: participant.access_key,
      });
      setParticipant(updatedParticipant);
      setSubmitMessage(updatedParticipant.hand_raised ? "已舉手，主持人會在看板上看到。" : "已放下舉手。");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "舉手狀態更新失敗。");
    } finally {
      setIsHandSubmitting(false);
    }
  }

  function handleResetIdentity() {
    clearParticipantAuth();
    setParticipant(null);
    setFormValues(defaultFormValues);
    setFieldErrors({});
    setSubmitError(null);
    setSubmitMessage("已清除這台裝置上的識別資料，現在可以建立新的學員卡片。");
  }

  return (
    <div className="mx-auto max-w-4xl">
      <section className="space-y-5">
        <div className="flex flex-col items-center px-2 pt-1 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#fff3e7] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#b06e4b]">
            <Smartphone className="h-4 w-4" />
            Join / 手機優先
          </div>
          <h2 className="font-display mt-4 text-[2.15rem] font-black leading-[1.02] tracking-[-0.04em] text-stone-900 sm:text-[3rem]">
            {hasExistingIdentity ? "更新我的狀態" : "建立我的狀態卡"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">
            用幾個清楚選項告訴主持人：現在狀態、能不能發言、是否需要協助。
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
            {[livePreview.mood, livePreview.intent, livePreview.joinMode, livePreview.energy].map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full bg-white/78 px-4 py-2 text-stone-600 shadow-[inset_0_0_0_1px_rgba(232,218,204,0.92)]"
              >
                <BadgeCheck className="h-4 w-4 text-[#4f755b]" />
                {label}
              </span>
            ))}
            {participant ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-[#edf6ee] px-4 py-2 font-semibold text-[#3e6d4e]">
                最近更新：{formatDateTime(participant.updated_at)}
              </span>
            ) : null}
          </div>
        </div>

        {!apiReady ? (
          <div className="soft-panel flex items-start gap-3 border border-[#f0c9b1] bg-[#fff3eb] px-5 py-4 text-sm text-[#9a5230]">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">尚未設定 API URL</p>
              <p className="mt-1 leading-6">
                請先在 `.env` 填入 `VITE_APPS_SCRIPT_API_URL`，並部署 `apps-script/Code.gs` 的新版後端。
              </p>
            </div>
          </div>
        ) : null}

        <form
          className="soft-panel space-y-6 px-5 py-6 sm:px-7 sm:py-7"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-stone-500">
            <p>{isHydrating ? "正在讀取這台裝置上的卡片..." : "可隨時修改後再次送出。"}</p>
            <p>送出後，投影頁下一輪刷新會同步。</p>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-stone-700">暱稱</span>
            <input
              className="soft-input"
              placeholder="例如：阿青、主持旁白、今天先聽"
              value={formValues.nickname}
              onChange={(event) => updateField("nickname", event.target.value)}
            />
            {fieldErrors.nickname ? (
              <p className="mt-2 text-sm text-[#b35f50]">{fieldErrors.nickname}</p>
            ) : null}
          </label>

          <ChoiceGrid
            title="現在情緒"
            values={moodValues}
            selected={formValues.mood}
            getLabel={(value) => `${moodLabels[value].emoji} ${moodLabels[value].label}`}
            onSelect={(value) => updateField("mood", value)}
          />

          <ChoiceGrid
            title="發言意願"
            values={intentValues}
            selected={formValues.intent}
            getLabel={(value) => `${intentLabels[value].emoji} ${intentLabels[value].label}`}
            onSelect={(value) => updateField("intent", value)}
            columns="sm:grid-cols-3"
          />

          <div className="grid gap-5 md:grid-cols-2">
            <ChoiceGrid
              title="參與方式"
              values={joinModeValues}
              selected={formValues.join_mode}
              getLabel={(value) => joinModeLabels[value]}
              onSelect={(value) => updateField("join_mode", value)}
              columns="grid-cols-1"
            />
            <ChoiceGrid
              title="社交能量"
              values={energyValues}
              selected={formValues.energy}
              getLabel={(value) => `${energyLabels[value].emoji} ${energyLabels[value].label}`}
              onSelect={(value) => updateField("energy", value)}
              columns="grid-cols-1"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-stone-700">一句話狀態</span>
              <span className="text-xs text-stone-500">{formValues.status_text.length}/40</span>
            </div>
            <input
              className="soft-input"
              placeholder="例如：剛進場、需要再說明一次、等一下開麥。"
              value={formValues.status_text}
              onChange={(event) => updateField("status_text", event.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {quickStatusPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={cn(
                    "chip-button px-3 py-2 text-sm font-semibold",
                    formValues.status_text === preset && "ring-2 ring-[#f0bf9f]",
                  )}
                  onClick={() => updateField("status_text", preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
            {fieldErrors.status_text ? (
              <p className="mt-2 text-sm text-[#b35f50]">{fieldErrors.status_text}</p>
            ) : null}
          </div>

          {submitError ? (
            <div className="rounded-[24px] bg-[#fff1ea] px-4 py-4 text-sm leading-6 text-[#a45240]">
              {submitError}
            </div>
          ) : null}

          {submitMessage ? (
            <div className="rounded-[24px] bg-[#eef7ef] px-4 py-4 text-sm leading-6 text-[#3e6b48]">
              {submitMessage}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              className="primary-button inline-flex items-center justify-center gap-2 px-5 py-3.5 font-bold disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={isSubmitting || isHydrating || !apiReady}
            >
              {isSubmitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {hasExistingIdentity ? "更新我的狀態" : "建立我的卡片"}
            </button>

            <button
              type="button"
              className={cn(
                "secondary-button inline-flex items-center justify-center gap-2 px-5 py-3.5 font-bold disabled:cursor-not-allowed disabled:opacity-55",
                participant?.hand_raised && "bg-[#fff1df] text-[#9c5f25]",
              )}
              onClick={() => void handleToggleHand()}
              disabled={isHandSubmitting || !hasExistingIdentity || !apiReady}
            >
              {isHandSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Hand className="h-4 w-4" />}
              {participant?.hand_raised ? "放下舉手" : "舉手 / 需要協助"}
            </button>

            {hasExistingIdentity ? (
              <button
                type="button"
                className="secondary-button inline-flex items-center justify-center gap-2 px-5 py-3.5 font-bold"
                onClick={handleResetIdentity}
              >
                <RefreshCcw className="h-4 w-4" />
                這台裝置改用新身份
              </button>
            ) : null}

            <Link
              to="/board"
              className="secondary-button inline-flex items-center justify-center gap-2 px-5 py-3.5 font-bold"
            >
              <MonitorSpeaker className="h-4 w-4" />
              先看投影板
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}

function ChoiceGrid<T extends Mood | Intent | JoinMode | Energy>({
  title,
  values,
  selected,
  getLabel,
  onSelect,
  columns = "grid-cols-2 sm:grid-cols-4",
}: {
  title: string;
  values: readonly T[];
  selected: T;
  getLabel: (value: T) => string;
  onSelect: (value: T) => void;
  columns?: string;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-stone-700">{title}</p>
      <div className={cn("grid gap-3", columns)}>
        {values.map((value) => (
          <button
            key={value}
            type="button"
            data-active={selected === value}
            className="chip-button flex min-h-12 items-center justify-center px-4 py-3 text-center font-bold"
            onClick={() => onSelect(value)}
          >
            {getLabel(value)}
          </button>
        ))}
      </div>
    </div>
  );
}
