/**
 * 組裝「AI 網站製作交接內容」的純函式。
 *
 * 為什麼是純函式、放在 packages/shared 而不是編輯器元件裡：
 * 這樣它可以被單元測試直接餵合成課程驗證輸出，不必掛上整個編輯器 UI；
 * 也不做任何網路呼叫——它只讀 CourseProject、吐出一段純文字，
 * 「不會自動外送」這句畫面上的承諾，靠的就是這支函式不 import 任何網路 API。
 */
import type { AiPageBrief, CourseProject, CoursePage } from './contracts.ts'

const BRIEF_STATUS_LABEL: Record<AiPageBrief['status'], string> = {
  draft: '草稿',
  'ready-for-ai': '可交給 AI',
  reviewed: '已複核',
}

/** 判斷這一頁的 AI 交接備註是否真的填了內容，而不是預設空殼。 */
function pageHasBriefContent(page: CoursePage): boolean {
  const brief = page.aiBrief
  if (!brief) return false
  return Boolean(brief.goal?.trim()) || Boolean(brief.instruction?.trim()) || Boolean(brief.interactionIntent?.trim())
    || brief.mustKeep.length > 0 || brief.avoid.length > 0 || brief.strictAssets.length > 0 || brief.pendingQuestions.length > 0
}

function listBlock(label: string, items: string[]): string {
  return `${label}：\n${items.map((item) => `- ${item}`).join('\n')}`
}

function formatPageBrief(page: CoursePage): string {
  const brief = page.aiBrief as AiPageBrief
  const lines: string[] = []
  lines.push(`### 第 ${page.order} 頁｜${page.title}（${page.id}）`)
  lines.push(`交接狀態：${BRIEF_STATUS_LABEL[brief.status] ?? brief.status}${brief.status === 'ready-for-ai' ? '　★ 已標示可交給 AI' : ''}`)
  if (brief.goal) lines.push(`教學目標：${brief.goal}`)
  if (brief.instruction) lines.push(`給 AI 的指示：${brief.instruction}`)
  if (brief.interactionIntent) lines.push(`互動意圖：${brief.interactionIntent}`)
  if (brief.mustKeep.length > 0) lines.push(listBlock('必留素材', brief.mustKeep))
  if (brief.avoid.length > 0) lines.push(listBlock('避免事項', brief.avoid))
  if (brief.strictAssets.length > 0) lines.push(listBlock('不得更動的素材', brief.strictAssets))
  if (brief.pendingQuestions.length > 0) lines.push(listBlock('待確認項', brief.pendingQuestions))
  return lines.join('\n')
}

/**
 * 寫入面契約：讓外部 AI 的產出天然落進合法通道（不變式 11、14）。
 * 這段文字對齊 docs/00_施工基準與交接.md「AI 課程檔寫入通道」與 tools/apply-course-file.mjs 的實際行為，
 * 兩邊改動時要一起改，不然這裡就會變成對外承諾了通道實際上不做的事。
 */
const WRITE_CONTRACT = [
  '你的產出方式：回傳一份完整的 project.json 候選檔。',
  '它會以 node tools/apply-course-file.mjs --project <代號> --from <候選檔> 落地，',
  '該通道會用與編輯器相同的驗證器檢查，以下情況會被拒絕且不寫入任何位元組：',
  '未知的元件型別、未知的規則動作或條件、指不到的頁面／元件／活動參照、',
  'top-option-is 條件指不到本頁的投票選項、死路（規則帶得進去卻沒有任何出口的頁面）。',
].join('')

export function buildAiHandoff(project: CourseProject): string {
  const pages = [...project.pages].sort((left, right) => left.order - right.order)
  const briefedPages = pages.filter(pageHasBriefContent)

  const sections: string[] = [
    '# AI 課程網站製作交接內容',
    `課程：${project.deckName}（${project.projectId}）\n頁數：${pages.length}　規則數：${project.rules.length}`,
    '## 逐頁交接備註',
    briefedPages.length > 0
      ? briefedPages.map(formatPageBrief).join('\n\n')
      : '（目前沒有任何頁面填寫 AI 交接備註。）',
    '## 寫入面契約（外部 AI 請依此產出，不要直接回傳網站程式碼）',
    WRITE_CONTRACT,
    '## 重要聲明',
    '這段內容不會自動外送，需要你自己複製貼上到外部 AI 對話中。',
  ]

  return sections.join('\n\n')
}
