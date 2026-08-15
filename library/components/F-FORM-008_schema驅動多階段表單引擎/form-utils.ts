import type { FormField, FormFieldOption, FormSchema, FormStage } from '@contracts/types';

/** `group` 欄位的一筆內容：內層 key → 值。 */
export type FormGroupItem = Record<string, string | string[]>;
export type FormAnswer = string | string[] | FormGroupItem[];
export type FormAnswers = Record<string, FormAnswer>;
export type FormErrors = Record<string, string>;

/** Converts legacy string options and structured options into one UI shape. */
export function normalizeOptions(options: FormField['options'] = []): FormFieldOption[] {
  return options.map((option) => typeof option === 'string' ? { label: option, value: option } : option);
}

export function isGroupItems(value: FormAnswer | undefined): value is FormGroupItem[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null && !Array.isArray(item));
}

/** Supplies an appropriate empty answer for a field. */
export function emptyAnswer(field: FormField): FormAnswer {
  if (field.type === 'group') return Array.from({ length: Math.max(1, field.minItems ?? 1) }, () => emptyGroupItem(field));
  return field.type === 'multiselect' || field.type === 'checkbox' ? [] : '';
}

export function emptyGroupItem(field: FormField): FormGroupItem {
  return Object.fromEntries((field.subFields ?? []).map((sub) => [sub.key, emptyAnswer(sub) as string | string[]]));
}

/** Builds a complete answer object while retaining supplied drafts. */
export function createAnswers(schema: FormSchema, initialValues: FormAnswers = {}): FormAnswers {
  return Object.fromEntries(schema.fields.map((field) => [field.key, initialValues[field.key] ?? emptyAnswer(field)]));
}

/** 條件顯示判定：無 `visibleWhen` 恆顯示。 */
export function isFieldVisible(field: FormField, answers: FormAnswers): boolean {
  const condition = field.visibleWhen;
  if (!condition) return true;
  const other = answers[condition.key];
  if (Array.isArray(other)) return other.some((item) => typeof item === 'string' && condition.equals.includes(item));
  return typeof other === 'string' && condition.equals.includes(other);
}

/** 依 `stage` 分組；未標 stage 者歸第 1 階段。 */
export function fieldsForStage(fields: FormField[], stage: number): FormField[] {
  return fields.filter((field) => (field.stage ?? 1) === stage);
}

export function stagesOf(schema: FormSchema): FormStage[] {
  if (schema.stages?.length) return [...schema.stages].sort((a, b) => a.stage - b.stage);
  const numbers = [...new Set(schema.fields.map((field) => field.stage ?? 1))].sort((a, b) => a - b);
  return numbers.map((stage) => ({ stage, title: `步驟 ${stage}` }));
}

function checkOne(field: FormField, value: FormAnswer | undefined, errorKey: string, errors: FormErrors) {
  const raw = value ?? emptyAnswer(field);
  const text = Array.isArray(raw) ? raw.join(', ') : raw.trim();
  if (field.required && (!text || (Array.isArray(raw) && raw.length === 0))) {
    errors[errorKey] = `請填寫「${field.label}」`;
    return;
  }
  if (!text) return;
  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) errors[errorKey] = '請輸入有效的 Email 格式';
  if (field.type === 'phone' && !/^(?:\+886[- ]?)?0?9\d{8}$|^0\d{1,2}[- ]?\d{6,8}$/.test(text.replace(/[()\s-]/g, ''))) errors[errorKey] = '請輸入有效的電話號碼';
}

/**
 * Validates required fields plus browser-equivalent email and Taiwan phone formats.
 * 只驗證目前可見的欄位；`group` 逐筆驗證，錯誤鍵為 `群組key.索引.內層key`。
 * `stage` 有值時只驗證該階段。
 */
export function validateAnswers(schema: FormSchema, answers: FormAnswers, stage?: number): FormErrors {
  const errors: FormErrors = {};
  const scoped = stage === undefined ? schema.fields : fieldsForStage(schema.fields, stage);
  for (const field of scoped) {
    if (!isFieldVisible(field, answers)) continue;
    if (field.type === 'group') {
      const items = isGroupItems(answers[field.key]) ? (answers[field.key] as FormGroupItem[]) : [];
      if (field.required && items.length === 0) { errors[field.key] = `請至少填寫一筆「${field.label}」`; continue; }
      items.forEach((item, index) => {
        for (const sub of field.subFields ?? []) {
          if (!isFieldVisible(sub, item as FormAnswers)) continue;
          checkOne(sub, item[sub.key], `${field.key}.${index}.${sub.key}`, errors);
        }
      });
      continue;
    }
    checkOne(field, answers[field.key], field.key, errors);
  }
  return errors;
}

/** 送出前移除條件不成立的欄位，避免殘留使用者已改掉的答案。 */
export function pruneHiddenAnswers(schema: FormSchema, answers: FormAnswers): FormAnswers {
  const output: FormAnswers = {};
  for (const field of schema.fields) {
    if (!isFieldVisible(field, answers)) continue;
    const value = answers[field.key];
    if (value === undefined) continue;
    if (field.type === 'group' && isGroupItems(value)) {
      output[field.key] = value.map((item) => Object.fromEntries(
        (field.subFields ?? [])
          .filter((sub) => isFieldVisible(sub, item as FormAnswers))
          .map((sub) => [sub.key, item[sub.key] ?? '']),
      ));
      continue;
    }
    output[field.key] = value;
  }
  return output;
}
