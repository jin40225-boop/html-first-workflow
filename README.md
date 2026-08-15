# html-first-workflow

一個給 Claude Code／Claude 用的技能（Skill）。核心主張只有一句：

> **動手生成任何東西之前，先給使用者一份可以點的 HTML，讓他用眼睛確認方向。**

避免的是那個最常見的浪費——「看到一段文字說明就開始生成，生成完才發現不是我要的」。

## 這個技能做什麼

它把「跟 AI 一起設計、修改、優化網站或軟體」這件事，變成兩種**單檔、離線、零外部相依**的 HTML 產出：

| | 協作確認台 | 客戶展示頁 |
|---|---|---|
| 給誰看 | 你自己 | 客戶、長官、不懂技術的人 |
| 做什麼 | 把 AI 的理解、現況、計畫、規格、矛盾、提問、決策、成本攤成一頁，你用點選標記回覆 | 擬真、可點、狀態真的會變的離線示範器，單檔寄得出去 |
| 標準 | **翻出**不確定性，逼你拍板 | **藏掉**不確定性，建立信心 |

確認台的八節順序是固定的三幕劇——**理解 → 現況 → 計畫 → 規格 → 矛盾 → 提問 → 決策 → 成本**。
因為你沒看到 AI 打算怎麼做，就無法判斷它問的問題重不重要。**計畫是提問的前置。**

## 自帶元件庫（`library/`）

這個技能**不需要連任何外部資料庫**。可複用的視覺與介面成果直接打包在裡面：

```
library/
  INDEX.md        ← 「我要做 X → 用哪個」對照表，技能啟動後第一個讀的檔
  ui/             ← 配色 token、19 頁可直接開的設計系統規格預覽
  components/     ← 命令面板、抽屜式編輯頁、協作看板、多階段表單引擎、公開展示組…
  tools/          ← 確認台匯出組裝、舊 Excel/VBA 勘查、資料去識別化、技能自檢
  principles/     ← 24 則做法原則（這些元件背後的判斷依據）
```

全部是在真實系統上跑過的成果，**原封不動複製**，每一條都附「移植點」說明哪幾行要換掉。

目的很單純：**換一台電腦、換一個人，都不必重新找元件或重建框架。**

## 安裝

```bash
git clone <this-repo> ~/.claude/skills/html-first-workflow
```

Windows：

```powershell
git clone <this-repo> "$env:USERPROFILE\.claude\skills\html-first-workflow"
```

裝完驗一下（會印出你裝的是哪一版）：

```bash
python ~/.claude/skills/html-first-workflow/scripts/health_check.py
```

輸出長這樣就對了：

```
Skill health check passed: /Users/you/.claude/skills/html-first-workflow
版本：5c4a989 2026-08-15 (git)
```

技能整包自足，不依賴任何本機絕對路徑。文件裡的指令用 `$skill` 變數，裝在別處只要改那一行。

## 升級（已經裝過舊版的人）

```bash
cd ~/.claude/skills/html-first-workflow && git pull && python scripts/health_check.py
```

Windows（PowerShell）：

```powershell
cd "$env:USERPROFILE\.claude\skills\html-first-workflow"; git pull; python scripts/health_check.py
```

跑完看「版本：」那一行的日期有沒有變新。**升級後要重開 Claude／Codex 的對話視窗**，技能是在對話開始時載入的。

如果 `git pull` 說 `not a git repository`（當初是下載壓縮檔裝的），砍掉重裝：

```bash
rm -rf ~/.claude/skills/html-first-workflow
git clone https://github.com/jin40225-boop/html-first-workflow.git ~/.claude/skills/html-first-workflow
```

## 結構

| 路徑 | 內容 |
|---|---|
| `SKILL.md` | 入口。溝通鐵律、三檔分級、兩軌產出、路線圖 |
| `references/` | 分項指引：確認台怎麼寫、展示頁怎麼做、成本、降級、盤點、架構、元件、驗證、事故紀錄 |
| `assets/` | 兩份骨架（純佔位）＋ 一份金標樣本 |
| `library/` | 自帶元件庫（見上） |
| `scripts/` | `validate_html.py`（交付前必跑）、`health_check.py`、`project_snapshot.py`、`capture_learning.py` |

## 六條溝通鐵律

1. **禁止開放式提問** —— 先把資料查完、方案想好，把選項擺出來讓人挑。
2. **每個選項必須寫「選了會發生什麼」＋「代價是什麼」** —— 沒寫這兩行的選項不准出現。
3. **白話優先** —— 非用術語不可時當場注解。
4. **成本必須主動預警** —— 成本與需求矛盾時要先講，並攤開幾條路的 CP 值。
5. **單一提問通道** —— 確認台交出去後，對話裡不准再重述任何提問或選項。
6. **靜態優先、漸進增強** —— 內容一律寫死在 HTML 裡，JavaScript 只做互動。

## 交付前必跑

```bash
python scripts/validate_html.py "<產出檔.html>"
```

15+ 項機器檢查：零外部相依、關掉 JS 讀不讀得到內容、viewport、列印樣式、深色定義、
個資紅線、確認台八節順序、每個選項有沒有寫影響與代價。**沒貼 `validate: PASS (n/n)` 那一行＝沒交付。**

## 關於範例資料

`library/` 裡的條目來自真實專案，**已做去識別化**：不含個人資料、真實地名或真實單位名稱。
示範資料一律虛構（證號用連號假碼、手機中間三碼一律 `000`、地址與單位名皆為「示範」字樣）。

`scripts/health_check.py` 內建這條紅線的自動掃描，發現疑似真實資訊會直接 FAIL。

## 授權

MIT
