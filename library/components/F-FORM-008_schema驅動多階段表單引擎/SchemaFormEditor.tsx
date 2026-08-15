import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import type { ChangeEvent } from 'react';
import type { FormField, FormFieldOption, FormFieldType, FormSchema } from '@contracts/types';
import { Select } from '@/components/ui/FormField';
import { TextInput } from '@/components/ui/FormField';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { WarmButton } from '@/components/ui/WarmButton';
import { WarmCard } from '@/components/ui/WarmCard';
import './form-engine.css';
import { normalizeOptions } from './form-utils';
import { SchemaForm } from './SchemaForm';

const fieldTypes: { value: FormFieldType; label: string }[] = [
  { value: 'text', label: '單行文字' }, { value: 'textarea', label: '多行文字' }, { value: 'email', label: 'Email' }, { value: 'phone', label: '電話' }, { value: 'select', label: '下拉選單' }, { value: 'multiselect', label: '多選時段' }, { value: 'checkbox', label: '核取方塊' },
];
const optionTypes = new Set<FormFieldType>(['select', 'multiselect', 'checkbox']);
const defaultField = (): FormField => ({ key: `field_${crypto.randomUUID().slice(0, 8)}`, label: '新欄位', type: 'text', required: false });

export interface SchemaFormEditorProps {
  /** Current schema owned by the parent. */ value: FormSchema;
  /** Called immediately with each immutable schema change. */ onChange: (schema: FormSchema) => void;
  /** Hides the embedded public-form preview when space is limited. */ showPreview?: boolean;
}

/** Admin editor for creating, ordering, and previewing dynamic form fields. */
export function SchemaFormEditor({ value, onChange, showPreview = true }: SchemaFormEditorProps) {
  const setField = (index: number, patch: Partial<FormField>) => onChange({ ...value, fields: value.fields.map((field, currentIndex) => currentIndex === index ? { ...field, ...patch } : field) });
  const addField = () => onChange({ ...value, fields: [...value.fields, defaultField()] });
  const removeField = (index: number) => onChange({ ...value, fields: value.fields.filter((_, currentIndex) => currentIndex !== index) });
  const moveField = (index: number, direction: -1 | 1) => { const target = index + direction; if (target < 0 || target >= value.fields.length) return; const fields = [...value.fields]; [fields[index], fields[target]] = [fields[target], fields[index]]; onChange({ ...value, fields }); };
  const setOptions = (index: number, options: FormFieldOption[]) => setField(index, { options });
  return <div className="schema-editor"><section className="schema-editor__fields"><div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}><SectionTitle size="sm">表單欄位</SectionTitle><WarmButton size="sm" icon={Plus} onClick={addField}>新增欄位</WarmButton></div>{value.fields.length === 0 ? <div className="schema-editor__empty">尚未建立欄位。請按「新增欄位」。</div> : value.fields.map((field, index) => <FieldEditor key={field.key} field={field} index={index} count={value.fields.length} onPatch={(patch) => setField(index, patch)} onMove={moveField} onRemove={removeField} onOptions={(options) => setOptions(index, options)} />)}</section>{showPreview ? <WarmCard className="schema-editor__preview"><SectionTitle size="sm">即時預覽</SectionTitle><div style={{ marginTop: '1rem' }}><SchemaForm key={JSON.stringify(value)} schema={value} onSubmit={() => undefined} submitLabel="預覽送出" /></div></WarmCard> : null}</div>;
}

interface FieldEditorProps { field: FormField; index: number; count: number; onPatch: (patch: Partial<FormField>) => void; onMove: (index: number, direction: -1 | 1) => void; onRemove: (index: number) => void; onOptions: (options: FormFieldOption[]) => void; }
function FieldEditor({ field, index, count, onPatch, onMove, onRemove, onOptions }: FieldEditorProps) {
  const options = normalizeOptions(field.options);
  const updateText = (name: 'key' | 'label' | 'helpText') => (event: ChangeEvent<HTMLInputElement>) => onPatch({ [name]: event.target.value });
  const changeType = (type: FormFieldType) => onPatch({ type, options: optionTypes.has(type) ? field.options ?? [] : undefined });
  return <WarmCard className="schema-editor__field"><div className="schema-editor__field-head"><strong>{index + 1}. {field.label || '未命名欄位'}</strong><div className="schema-editor__field-actions"><WarmButton size="sm" variant="secondary" aria-label="上移欄位" disabled={index === 0} onClick={() => onMove(index, -1)}><ChevronUp size={16} /></WarmButton><WarmButton size="sm" variant="secondary" aria-label="下移欄位" disabled={index === count - 1} onClick={() => onMove(index, 1)}><ChevronDown size={16} /></WarmButton><WarmButton size="sm" variant="danger" aria-label="刪除欄位" onClick={() => onRemove(index)}><Trash2 size={16} /></WarmButton></div></div><div className="schema-editor__grid"><TextInput label="欄位名稱" name={`label-${field.key}`} value={field.label} onChange={updateText('label')} /><TextInput label="欄位識別碼" name={`key-${field.key}`} value={field.key} onChange={updateText('key')} helpText="送出資料的固定 key，請使用英數與底線。" /><Select label="欄位類型" name={`type-${field.key}`} value={field.type} onChange={(event) => changeType(event.target.value as FormFieldType)} options={fieldTypes} /><TextInput label="說明文字" name={`help-${field.key}`} value={field.helpText ?? ''} onChange={updateText('helpText')} /></div><label className="ui-choice"><input type="checkbox" checked={field.required} onChange={(event) => onPatch({ required: event.target.checked })}/>必填欄位</label>{optionTypes.has(field.type) ? <OptionEditor options={options} onChange={onOptions} /> : null}</WarmCard>;
}

function OptionEditor({ options, onChange }: { options: FormFieldOption[]; onChange: (options: FormFieldOption[]) => void }) {
  const patch = (index: number, value: Partial<FormFieldOption>) => onChange(options.map((option, currentIndex) => currentIndex === index ? { ...option, ...value } : option));
  return <div className="schema-editor__options"><strong>選項</strong>{options.map((option, index) => <div className="schema-editor__option" key={`${option.value}-${index}`}><input className="ui-field__control" aria-label="選項文字" value={option.label} onChange={(event) => patch(index, { label: event.target.value })}/><input className="ui-field__control" aria-label="選項值" value={option.value} onChange={(event) => patch(index, { value: event.target.value })}/><label className="ui-choice"><input type="checkbox" checked={option.disabled ?? false} onChange={(event) => patch(index, { disabled: event.target.checked, disabledLabel: event.target.checked ? option.disabledLabel ?? '（額滿）' : undefined })}/>額滿</label><WarmButton size="sm" variant="danger" aria-label="刪除選項" onClick={() => onChange(options.filter((_, currentIndex) => currentIndex !== index))}><Trash2 size={16}/></WarmButton></div>)}<WarmButton size="sm" variant="secondary" icon={Plus} onClick={() => onChange([...options, { label: '新選項', value: `option_${options.length + 1}` }])}>新增選項</WarmButton></div>;
}
