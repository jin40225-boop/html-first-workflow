import { useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { FormField, FormSchema } from '@contracts/types';
import { CheckboxGroup } from '@/components/ui/FormField';
import { RadioGroup } from '@/components/ui/FormField';
import { Select } from '@/components/ui/FormField';
import { Textarea } from '@/components/ui/FormField';
import { TextInput } from '@/components/ui/FormField';
import { WarmButton } from '@/components/ui/WarmButton';
import { WarmCard } from '@/components/ui/WarmCard';
import './form-engine.css';
import {
  createAnswers, emptyGroupItem, fieldsForStage, isFieldVisible, isGroupItems,
  normalizeOptions, pruneHiddenAnswers, stagesOf, validateAnswers,
} from './form-utils';
import type { FormAnswer, FormAnswers, FormGroupItem } from './form-utils';

export interface SchemaFormProps {
  /** Field schema supplied by the project configuration. */ schema: FormSchema;
  /** Receives validated answers only after the user confirms the review page. */ onSubmit: (answers: FormAnswers) => void | Promise<void>;
  /** Values used when editing a draft. */ initialValues?: FormAnswers;
  /** Primary submit button text. */ submitLabel?: string;
  /** Disables form interaction while an outer action is pending. */ disabled?: boolean;
}

/** Dynamic public form with staged steps, client validation, error focus, and a confirmation step. */
export function SchemaForm({ schema, onSubmit, initialValues, submitLabel = '確認送出', disabled = false }: SchemaFormProps) {
  const initial = useMemo(() => createAnswers(schema, initialValues), [schema, initialValues]);
  const stages = useMemo(() => stagesOf(schema), [schema]);
  const [answers, setAnswers] = useState<FormAnswers>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stageIndex, setStageIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const firstErrorRef = useRef<HTMLDivElement>(null);

  const stage = stages[stageIndex] ?? stages[0];
  const isLastStage = stageIndex >= stages.length - 1;
  const visibleFields = fieldsForStage(schema.fields, stage.stage).filter((field) => isFieldVisible(field, answers));

  const updateAnswer = (key: string, value: FormAnswer) => setAnswers((current) => ({ ...current, [key]: value }));

  const focusFirstError = () => requestAnimationFrame(() => firstErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));

  const advance = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateAnswers(schema, answers, stage.stage);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { focusFirstError(); return; }
    if (isLastStage) { setReviewing(true); } else { setStageIndex((index) => index + 1); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backToStage = (index: number) => { setReviewing(false); setStageIndex(index); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  if (reviewing) {
    return (
      <WarmCard className="schema-confirmation" style={{ padding: '1.25rem' }}>
        <h2>請確認填寫內容</h2>
        {stages.map((item, index) => (
          <section key={item.stage} className="schema-confirmation__stage">
            {stages.length > 1 ? (
              <div className="schema-confirmation__stage-head">
                <h3>{item.title}</h3>
                <WarmButton variant="secondary" size="sm" onClick={() => backToStage(index)} disabled={disabled}>修改</WarmButton>
              </div>
            ) : null}
            <dl className="schema-confirmation__answers">
              {fieldsForStage(schema.fields, item.stage)
                .filter((field) => isFieldVisible(field, answers))
                .map((field) => (
                  <div key={field.key}>
                    <dt>{field.label}</dt>
                    <dd>{displayAnswer(field, answers[field.key])}</dd>
                  </div>
                ))}
            </dl>
          </section>
        ))}
        <div className="schema-form__actions">
          <WarmButton variant="secondary" onClick={() => backToStage(stages.length - 1)} disabled={disabled}>返回修改</WarmButton>
          <WarmButton onClick={() => void onSubmit(pruneHiddenAnswers(schema, answers))} disabled={disabled}>{submitLabel}</WarmButton>
        </div>
      </WarmCard>
    );
  }

  return (
    <form className="schema-form" noValidate onSubmit={advance}>
      {stages.length > 1 ? (
        <ol className="schema-form__stepper" aria-label="報名步驟">
          {stages.map((item, index) => (
            <li key={item.stage} className={`schema-form__step${index === stageIndex ? ' is-active' : ''}${index < stageIndex ? ' is-done' : ''}`} aria-current={index === stageIndex ? 'step' : undefined}>
              <span className="schema-form__step-number">{index + 1}</span>{item.title}
            </li>
          ))}
        </ol>
      ) : null}
      {stage.intro ? <p className="schema-form__intro">{stage.intro}</p> : null}
      {visibleFields.map((field) => (
        <div key={field.key} ref={errors[field.key] ? firstErrorRef : undefined}>
          {renderField(field, answers, errors, updateAnswer)}
        </div>
      ))}
      <div className="schema-form__actions">
        {stageIndex > 0 ? <WarmButton type="button" variant="secondary" onClick={() => backToStage(stageIndex - 1)} disabled={disabled}>← 上一步</WarmButton> : null}
        <WarmButton type="submit" disabled={disabled}>{isLastStage ? submitLabel : '下一步 →'}</WarmButton>
      </div>
    </form>
  );
}

function displayAnswer(field: FormField, value: FormAnswer | undefined) {
  if (field.type === 'group' && isGroupItems(value)) {
    if (value.length === 0) return '—';
    return (
      <ul className="schema-confirmation__group">
        {value.map((item, index) => (
          <li key={index}>
            <b>{field.itemLabel ?? field.label} {index + 1}</b>
            <span>{(field.subFields ?? [])
              .filter((sub) => isFieldVisible(sub, item as FormAnswers))
              .map((sub) => `${sub.label}：${flatten(item[sub.key], sub)}`)
              .join('｜')}</span>
          </li>
        ))}
      </ul>
    );
  }
  return flatten(value, field);
}

/** 有選項的欄位以標籤顯示，避免確認頁出現場次 UUID 這類機器值。 */
function flatten(value: FormAnswer | undefined, field?: FormField): string {
  const labelOf = (raw: string) => {
    if (!field?.options) return raw;
    return normalizeOptions(field.options).find((option) => option.value === raw)?.label ?? raw;
  };
  if (Array.isArray(value)) return value.map((item) => typeof item === 'string' ? labelOf(item) : '').filter(Boolean).join('、') || '—';
  return value ? labelOf(value) : '—';
}

function renderField(
  field: FormField,
  answers: FormAnswers,
  errors: Record<string, string>,
  onChange: (key: string, value: FormAnswer) => void,
  keyPrefix = '',
) {
  const fieldKey = `${keyPrefix}${field.key}`;
  const value = answers[field.key];
  const error = errors[fieldKey];
  const common = { label: field.label, helpText: field.helpText, error, required: field.required, name: fieldKey };

  if (field.type === 'group') {
    const items = isGroupItems(value) ? value : [];
    const min = Math.max(1, field.minItems ?? 1);
    const max = field.maxItems ?? 10;
    const setItems = (next: FormGroupItem[]) => onChange(field.key, next);
    const patch = (index: number, subKey: string, subValue: string | string[]) =>
      setItems(items.map((item, position) => position === index ? { ...item, [subKey]: subValue } : item));
    return (
      <fieldset className="schema-form__group">
        <legend>{field.label}{field.required ? <span className="ui-field__required">*</span> : null}</legend>
        {field.helpText ? <p className="schema-form__group-help">{field.helpText}</p> : null}
        {items.map((item, index) => (
          <div className="schema-form__group-item" key={index}>
            <div className="schema-form__group-item-head">
              <b>{field.itemLabel ?? field.label} {index + 1}</b>
              {items.length > min ? (
                <WarmButton type="button" variant="secondary" size="sm" onClick={() => setItems(items.filter((_, position) => position !== index))}>✕ 移除</WarmButton>
              ) : null}
            </div>
            {(field.subFields ?? [])
              .filter((sub) => isFieldVisible(sub, item as FormAnswers))
              .map((sub) => (
                <div key={sub.key}>
                  {renderField(sub, item as FormAnswers, errors, (subKey, subValue) => patch(index, subKey, subValue as string | string[]), `${field.key}.${index}.`)}
                </div>
              ))}
          </div>
        ))}
        {items.length < max ? (
          <WarmButton type="button" variant="secondary" onClick={() => setItems([...items, emptyGroupItem(field)])}>
            {field.addLabel ?? `＋ 新增一筆${field.itemLabel ?? ''}`}
          </WarmButton>
        ) : null}
      </fieldset>
    );
  }

  if (field.type === 'textarea') return <Textarea {...common} value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(field.key, event.target.value)} />;
  if (field.type === 'select') return <Select {...common} value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(field.key, event.target.value)} options={[{ label: '請選擇', value: '' }, ...normalizeOptions(field.options)]} />;
  if (field.type === 'radio') return <RadioGroup label={field.label} name={fieldKey} required={field.required} helpText={field.helpText} error={error} value={typeof value === 'string' ? value : ''} onChange={(next) => onChange(field.key, next)} options={normalizeOptions(field.options)} />;
  if (field.type === 'multiselect' || field.type === 'checkbox') return <CheckboxGroup label={field.label} name={fieldKey} required={field.required} helpText={field.helpText} error={error} value={Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []} onChange={(next) => onChange(field.key, next)} options={normalizeOptions(field.options).map((option) => ({ ...option, label: `${option.label}${option.disabled && option.disabledLabel ? option.disabledLabel : ''}` }))} />;
  return <TextInput {...common} type={field.type === 'phone' ? 'tel' : field.type} value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(field.key, event.target.value)} />;
}
