import type { FormSchema } from '@contracts/types';
/** Development-only fake schema; contains no real registrant data. */
export const mockConsultationSchema: FormSchema = { projectId: 'demo-parent-consultation', fields: [
  { key: 'name', label: '姓名', type: 'text', required: true, helpText: '請填寫方便稱呼的姓名。' },
  { key: 'email', label: '電子信箱', type: 'email', required: true, helpText: '通知將寄送至此信箱。' },
  { key: 'phone', label: '聯繫電話', type: 'phone', required: true },
  { key: 'topic', label: '想諮詢的主題', type: 'textarea', required: true },
  { key: 'slots', label: '可配合時段', type: 'multiselect', required: true, options: [{ value: 'mon-evening', label: '週一晚上' }, { value: 'wed-evening', label: '週三晚上', disabled: true, disabledLabel: '（額滿）' }] },
] };
