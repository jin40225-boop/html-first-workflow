# Growth Memory

This file stores durable lessons about the user's software and web-design preferences. Add short dated entries when a lesson should shape future projects.

## Current Durable Preferences

- The user wants skills to grow with real project work, not remain static instructions.
- The user values project memory: architecture, logic, components, principles, and features should be captured so future sessions do not rediscover them.
- Project-specific skills are useful for concrete systems, while this skill should remain the general workflow layer.
- For operational tools, prioritize actual usable workflows over decorative landing pages.
- When building systems, connect UI fields to real data, downstream outputs, validation, and deployment, not only visual mockups.

## How To Add A Lesson

Use this format:

```markdown
### YYYY-MM-DD - Short Title

- Context: what project/task revealed the lesson.
- Preference: what the user tends to want.
- Apply next time: what the AI should do differently.
```

Keep this file practical. Do not store private secrets, temporary bugs, or one-off details that belong in a project-specific skill.

### 2026-05-11 - GAS + Google Sheet Interactive Board Pattern

- Context: The user's cashflow project is a Google Apps Script Web App backed by Google Sheet, with separate `Input.html`, `Host.html`, and `Public.html` views plus `Code.js`, `Schema.js`, `.clasp.json`, and `appsscript.json`.
- Preference: When the user asks to inspect this kind of project, they want architecture, logic, components, and functional flows mapped together, not only a file list. They also care that the true main copy follows their current source-of-truth rule, such as OneDrive being the master when declared.
- Apply next time: For GAS interactive projects, first identify the actual source folder and whether it is only a reference copy. Then map routes, sheet tables, API functions, frontend pages, sync intervals, scenario/original-state separation, deployment settings, and encoding risks.

### 2026-05-11 - Preserve Original vs Scenario Data

- Context: The user's cashflow board depends on comparing an original version with an adjusted scenario version.
- Preference: Interactive financial/demo tools should preserve original data and write scenario changes separately, so public projections can compare both states clearly.
- Apply next time: Inspect whether edits overwrite source rows or append/activate scenario rows. Verify `0` values, merge behavior across multiple fields, clear/reset behavior, and public/host synchronization before touching UI polish.

### 2026-05-11 - Data Governance Pipeline Identity

- Context: The user's Kaikai data project exposed a recurring risk in AI-assisted desktop web systems: legacy servers, stale docs, session caches, and canonical graph stores can all coexist and make an app look correct while running the wrong mechanism.
- Preference: When taking over data-governance or graph-pipeline tools, explicitly verify runtime identity, source of truth, legacy write paths, model names, and hydration from canonical storage before judging progress.
- Apply next time: Map the desktop shortcut/start script -> server entrypoint -> UI endpoint -> API status -> canonical data files; add visible system-status UI and regression checks so old data or old mechanisms cannot silently contaminate new runs.

### 2026-05-11 - Internal Admin Apps Need Delivery Alignment

- Context: The family activity-signup system evolved from a generic login-based web app into shared-folder delivery with fixed-identity personal versions, scoped Excel workbooks, and an updated source/documentation snapshot.
- Preference: For internal administrative software, the user cares about the whole operating package: launchers, role identity, shared data, Excel handoff files, documentation, backups, and deployment logs must agree with each other.
- Apply next time: Treat "done" as deployed and checked through the actual user launch path. Verify the central data path, per-person profile config, permission scope, generated Excel, source snapshot, plan documents, deploy summary, and tests in one final alignment pass.

### 2026-05-11 - Excel Is A Handoff Surface, Not Just A File

- Context: The family activity-signup workbooks had to preserve the user's existing Excel habit while staying connected to the app's canonical database and frontend fields.
- Preference: Excel outputs should be useful operational artifacts: field-aligned, dropdown-ready, scoped by role, and readable by staff who may use them outside the app.
- Apply next time: Generate Excel from canonical data, include a field mapping or guide sheet, derive dropdown lists from the active source forms/roster, prefill only the user's permitted rows, and keep blank usable rows for future data entry.

### 2026-05-13 - Legacy Excel/VBA Modernization Needs A Source Chain

- Context: The 個案管理系統 social-service case-management project transformed a proven Excel/VBA workflow into a Flask/HTMX/SQLite desktop-web application with packaged per-user launchers.
- Preference: When modernizing office systems, the user wants proven field logic preserved, not replaced by generic web-app assumptions. New software should explicitly state which legacy behavior is inherited, surpassed, or intentionally removed.
- Apply next time: Before coding, locate the entry instructions, frozen blueprint, schema, legacy module map, phase plan, and TBD list. Map legacy modules/functions to new services and tests, preserve domain vocabulary, and add code/docs references for business rules that came from the old system.

### 2026-05-13 - Sensitive Migration Work Needs A Hard AI Boundary

- Context: 個案管理系統 involved real case files, legacy Excel/xlsm sources, SQLite databases, migration logs, and personally identifiable information.
- Preference: The user is comfortable having AI use local scripts to consolidate data when the work stays on the user's machine and is driven by user-provided forms, file locations, and VBA/business-logic maps. The boundary is against AI chat directly inspecting or receiving true private rows, databases, or sensitive logs.
- Apply next time: Use a script-mediated local workflow: read the user's intake form for source locations and legacy logic, maintain the scripts and SOPs, run or guide safe local commands when appropriate, redirect sensitive logs locally, ask only for aggregate pass/fail or sanitized error categories, and require backups before any real database write.

### 2026-05-13 - Phase Reports Are Project Memory

- Context: 個案管理系統 used phase instructions plus completion reports covering finished work, deferred items, technical decisions, legacy mappings, verification commands, and next-phase prerequisites.
- Preference: For long-running builds, the user wants progress to be resumable by another agent without rediscovering why choices were made.
- Apply next time: End each milestone with a compact report that names completed behavior, unfinished scope with reasons, technical decisions, source/legacy mappings, exact verification results, and the next handoff checklist.

### 2026-05-21 - Preview Version Alignment Is A Process, Not A Search

- Context: Across multiple Claude Code sessions (個案管理系統, activity-signup, GAS cashflow, etc.) the user kept hitting "preview opens wrong version" — Claude launched dev servers, opened browsers, but the page was from a stale folder, stale branch, stale build, lingering port, or cached bundle. Each session burned time on "find the correct version" detective work.
- Preference: The user does not want Claude to keep "finding the right preview"; the user wants the system to show its version so detective work disappears. They are willing to invest setup time once if it removes the recurring confusion. They also pointed out that the working pattern in 個案管理系統 (`/api/version` endpoint + fixed-port multi-instance + `start.ps1`) already solves this — so the lesson is to apply that pattern earlier in other projects.
- Apply next time: When starting any web/desktop project — or the first time a "wrong version" complaint appears in an existing one — propose ONE durable fix before doing more UI work: a single trusted preview entry (script that prints path/branch/commit, kills old server on fixed port, opens browser only when reachable), a dev-only UI watermark with branch+commit+build time, and/or a `/api/version`-style status endpoint. Before declaring any preview ready, always deliver four lines: 資料夾 / 分支 / commit / 網址. Do not silently switch ports, paths, branches, or worktrees. See `references/quality-validation.md` "Preview Version Alignment" section.

### 2026-05-13 - Trust-And-Audit Beats Over-Approval In Internal Tools

- Context: 個案管理系統 deliberately avoided password login and heavy approval states, using fixed identity launchers, two-state confirmations, role-scoped masking, and immutable history records.
- Preference: For small internal teams, the user often prefers workflows that trust staff to act while preserving a complete audit trail, instead of adding bureaucratic approval gates.
- Apply next time: Model the real social contract precisely. A "confirmation" may mean "received" rather than "approved"; a current-row flag can exist for fast UI, but important actions need durable history, actor, timestamp, old/new values, and downstream export/report visibility.

### 2026-06-08 - GSAP 捲動揭示用 from 不用 to
- Preference: ScrollTrigger 進場揭示一律用 gsap.from()，不要用『CSS 藏 opacity:0 + gsap.to()』。.to() 只在偵測到 enter 時播放，使用者用 #錨點/深連結/章節導航直接跳到中段時不會觸發，整段永久留白。.from() 的 immediateRender 會在初始化設好起始值，載入時若已捲過觸發點就直接播到可見，任何抵達方式都正確。漸層 background-clip:text 文字逐字拆分時，每個 char span 要各自帶 gradient（clip 無法跨 span）。

### 2026-07-31 - Excel 多人協作的單一寫入者架構
- Preference: 個案管理系統 Lite 確立的輕量多人模式：不建共用資料庫，改為『每個 Excel 檔只有一個寫入者』——本人軟體寫本人檔、督導寫派案簿、承辦只寫自己的簽收欄與自己的收件頁；跨人需求（查核/彙整/重複偵測）全部走唯讀掃描層隨時重跑。寫 .xlsm 一律 xlwings（COM），openpyxl 只准唯讀與 .xlsx；寫前自動備份。此模式可替代整套 server+DB 架構，適用於小團隊 Office 化行政系統。

### 2026-08-04 - OneDrive 內的正式 git checkout 會爛掉
- Preference: 家長支持平台審查發現：正式 checkout 放在 OneDrive 同步範圍導致 (1) node_modules 被同步破壞、10 個直接相依套件消失、本機無法 typecheck/build；(2) git diff 出現 mmap failed 錯誤。教訓：正式開發 checkout 應放在 OneDrive 之外（或至少排除 node_modules 同步），OneDrive 只放文件與備份。審查任何專案時，若 repo 路徑含 OneDrive，先驗證 node_modules 完整性再相信本機檢查結果。

### 2026-08-10 - 場次卡以月為聚合單位
- Preference: 資料庫驅動的場次列表，卡片單位必須是「月」而不是「單一時段」：一個月一張卡，該月的多個時段以列表收在卡內，每列自帶剩餘名額與報名動作。以時段為卡片單位會讓卡片數隨時段線性膨脹，卡片間 90% 內容（服務名、月份、日期）重複——家長支持平台 /parent 實測 15 張 344px 卡佔手機整頁 42%、全頁 15.1 個螢幕。另一條連帶教訓：把手寫內容改成資料庫驅動時，不可順手拿掉摺疊／聚合機制並以「資料庫驅動所以不需要」作為理由；資料量從此由後台決定，聚合反而比手寫時代更必要。

### 2026-08-15 - 確認台的節次順序：計畫是提問的前置
- Context: 使用者打開確認台骨架，發現舊順序把「提問／決策」放在「計畫／規格」之前。他的原話：「你前面沒有給我看你目前的計畫，要怎麼依照計畫或理解對我提問？」「前面沒有計畫或提案、方向，這裡我要拍板什麼？」「我認為對我需求的理解擺第一，這樣才順。」
- Preference: 八節排成三幕——第一幕「我懂了什麼、要做什麼」（理解→現況→計畫→規格），第二幕「我卡在哪、要你定」（矛盾→提問→決策），第三幕「代價」（成本）。三幕不可交錯。
- Apply next time: 使用者沒看到你打算怎麼做，就無法判斷你問的問題重不重要、也無法拍板。這跟依賴圖的「根在前、葉在後」是同一條原則的兩個層次——節與節之間也有依賴。`validate_html.py` 會擋順序錯誤。

### 2026-08-15 - 提問前必須先建依賴圖，否則一定會重複問
- Context: 使用者：「AI 在思考、規劃、提問時沒有意識到問題本身是有集群、歸屬、上下或關聯關係的，導致提問無法精準、重複的問題一直問。」顧問模型拿真實產出逐條指認，找到 9 條隱性關聯與 2 組實質重複——其中一組（Q1 與 U1）AI 自己在選項的「影響」欄裡就寫了「我會建議 U1 選 B」，等於親手宣告了依賴，卻還是拆成兩題各要使用者拍板一次。
- Preference: 題目彼此連動時要像問卷的跳題邏輯——答了 A 就該讓不相干的 B 變暗，同類的題要放在一起。
- Apply next time: **依賴圖的第一用途是在寫作期把題砍掉，第二用途才是執行期的跳題引擎。** 只加引擎不跑建圖程序，重複的題只會從「重複問」變成「重複寫然後互相滅音」。偵測法：自己寫的「→ 影響」欄只要提到另一題，那就是一條邊。三個重複判準：推薦重疊／事實—行動對／互相引用。程序見 `references/review-console.md`。失效的卡片絕不能直接消失——最大的風險是錯誤的規則把該問的題滅音了。

### 2026-08-14 - 品質規則寫在 Markdown 靠 AI 自評，一定會失效
- Context: 顧問模型審查本技能時的核心判斷——這個技能的三次失敗全是「AI 自認完成」的產物；而當天新寫的 `health_check.py` 就已經沒檢查五個新支柱檔案，證明「機制跟不上內容」不是假設。
- Preference: 能機器判定的規格一律交給機器，並把驗證結果變成使用者一眼可稽核的東西。
- Apply next time: 交付任何 HTML 前跑 `scripts/validate_html.py`，把最後一行 `validate: PASS (n/n)` 貼進交付訊息；沒貼＝沒交付，未通過不得交付。新增規則時同步問一句「這條能不能寫進 validator」，能就寫進去，不能才留在指引裡靠人看。

### 2026-08-14 - assets 放的必須是骨架，不能是上一個案子的成品
- Context: 第一版 `review-console-template.html` 直接沿用技能建置會話的實檔，裡面 12 則卡片全是已結案的決策，還夾帶一條已被推翻的成本規則、一個身分證格式字串、以及沒改的 DOC_ID。
- Preference: 模板要瘦成佔位骨架，每節只留一張示範卡。
- Apply next time: 骨架的識別碼用明顯的佔位值（`PROJECT-ID-CHANGE-ME`）並寫進 validator 的黑名單——複製後忘了改，機器會擋。實檔要留底就放專案資料夾，不要放技能 assets：沒改的 DOC_ID 會讓下一個專案載入上一案的瀏覽器草稿，決議紀錄當場污染。

### 2026-08-14 - 給選項而不是丟問題，而且選項要寫「影響」與「代價」
- Context: 建立本技能（HTML 雙軌）的過程中，AI 連續三版被退回。
- Preference: 使用者不是工程師，他明說「我又不是真正的工程師或 AI 專家，我怎麼會知道怎麼樣比較好？」。凡是純技術取捨（資料上限怎麼訂、模板放哪、要不要拆檔），AI 必須**自己查完、自己決定、說明理由**，不准丟回去問。真正要問他的只有「只有他知道的事」——他客戶的習慣、他的偏好、他的工作現場。
- Apply next time: 提案一律附 2–4 個選項，每個選項強制寫兩行：「→ 影響（選了會發生什麼）」與「代價（會失去什麼、多花什麼）」，包含推薦的那一個。沒寫這兩行的選項視為無效。使用者原話：「妳沒有說原因和影響、好的跟壞的，我無法決策。」

### 2026-08-14 - 內容用 JS 生成 = 把內容押在隨時會被關掉的功能上
- Context: 協作確認台 v3 把 12 則卡片寫成 JavaScript 在開檔時生成。使用者用內建檢視器開 `file://` 檔，該檢視器不執行內嵌 JS，整份內容一片空白，只剩靜態的頭尾。使用者：「我沒看到啊？」
- Preference: 任何交付出去的 HTML，內容必須是靜態標記；JavaScript 只能做互動增強。互動元件預設隱藏由 JS 開啟，降級說明預設顯示由 JS 隱藏。
- Apply next time: 交付前第一項檢查就是「關掉 JavaScript 還讀得到全部內容嗎」。完整清單見 `references/delivery-resilience.md`。這條適用於所有寄出去、被別人用未知檢視器打開的 HTML，不限確認台。

### 2026-08-14 - 確認台交出去後，對話裡不准再問任何事
- Context: AI 在交付訊息裡順手複述了確認台裡的一則提問，使用者立刻抓到：「妳為何不用 HTML 提問？」
- Preference: 確認台一旦交出去就是唯一的提問通道。交付訊息只准包含四樣：檔案在哪、這版差在哪、怎麼回覆、四行版本區塊。
- Apply next time: 想強調某幾則只給編號不給內容（「A2、M1 最關鍵」）。理由：對話裡出現同一個問題，使用者會順手在對話裡回，該則標記是空的、匯出的 JSON 缺了它，決議紀錄當場分岔。

### 2026-08-14 - 成本欄的用途是預警與攤開 CP 值，不是附一個免費版交差
- Context: 使用者修正 AI 對「要花錢就給免費方案」的理解。
- Preference: 重點是「幫我釐清成本，然後提供 CP 值相符的方案」，以及「當成本與計畫產生矛盾時的預警機制」。他同時說「我要做到最好」——為了免費把功能閹割到不能用是錯的答案。
- Apply next time: 偵測到高頻呼叫、資料持續成長、多人並發、對外連線、寄信推播等訊號時**主動預警**，並固定給三條路：降規格／改做法／付費升級，每條寫清楚少什麼、慢多少、每月每年多少錢，並明確推薦一條。詳見 `references/cost-and-tradeoffs.md`。

### 2026-08-10 - 既有互動功能不得在改版時順手拿掉
- Preference: 使用者裁決（家長支持平台 2026-08-10）：場次卡的『點開摺疊看詳細介紹』是既定格式，除非使用者明確要求拿掉，否則任何改版都必須維持。這條的普遍教訓是：把手寫內容改成資料庫驅動時，最容易在『反正資料庫會給』的理由下砍掉互動與聚合機制——但該功能的說明文字往往留著（本例 HomePage/PeerGroupPage 都還寫著『(點開有詳細介紹喔！)』而卡片點不開），變成假功能。改版移除任何互動前，先問『使用者有沒有明確說要拿掉』，沒有就保留；真要拿掉，同一個 commit 必須把承諾該功能的文案一起清乾淨。附帶：還原舊功能時要檢查資料模型接不接得住——本例舊卡的『我們聊什麼』內文在新 schema 裡根本沒有欄位可放。

### 2026-08-17 - .jsonly 用清 inline style 開啟，等於整條工具列永遠不出現
- Context: 用骨架產出 ai-course-deck 的確認台後，照規矩用 Playwright 實際開來看，發現頂端「複製回覆給 AI／匯出／匯入／主題」工具列、進度列與篩選器在有 JS 的瀏覽器下**完全看不到**。原因：`.jsonly{display:none}` 在樣式表裡排在 `.tools`／`.progress`／`.filters` 之後，同為單一 class 選擇器時後者勝出；而骨架的開啟方式是 `el.style.display=""`——清掉的是 inline style，class 規則原封不動。定義在 `.jsonly` 之後的 `.subrow`、`.marks` 剛好不受影響，所以底部那顆「複製回覆給 AI」還在，主要功能沒斷，這個洞才一直沒被發現。`validate_html.py` 當時 25 項全 PASS——它只檢查「有沒有預設隱藏」，沒檢查「有 JS 時會不會顯示回來」。
- Preference: 交付前要真的用瀏覽器打開來看，不能只看 validator 全綠。
- Apply next time: 開啟 `.jsonly` 一律用 `classList.remove("jsonly")`，不要用 `style.display=""`——移除 class 才會讓元素回到它自己的 display 值。已修 `assets/review-console-template.html`，並在 `validate_html.py` 加了一條機器檢查（「有 JS 時 .jsonly 會真的顯示回來」）。更普遍的一課：**漸進增強的「增強」那一半也要驗**。降級路徑（關掉 JS 還讀不讀得到）已經有檢查了，反方向沒有；只驗一半的守門，跟沒驗過的守門是同一種東西。

### 2026-08-17 - 「已複製」的提示是騙人的：execCommand 失敗回 false，不丟例外
- Context: 使用者把 16 則確認台整份填完，按「複製回覆給 AI」，畫面跳出「已複製」，貼到對話卻是空的——他問「妳這個功能無法使用？」。骨架的退路是 `try{document.execCommand("copy");done()}catch(e){...}`：**被擋時 execCommand 回傳 `false` 而不是丟例外**，所以 catch 永遠不會進去，`done()` 照樣跑，toast 照樣說已複製。內嵌檢視器（非獨立 Chrome）常同時擋掉 `navigator.clipboard` 與 execCommand，兩條路一起斷，而使用者只看得到一句「已複製」。
- Preference: 回收使用者的作答不可以只有剪貼簿與下載兩條路——兩條都可能被檢視器擋掉，而且擋掉時不一定會報錯。
- Apply next time: ① 任何 `execCommand` 一律檢查回傳值，`===true` 才算成功。② 必備第三條退路：把回覆整段攤在頁面上的 textarea 並自動全選，讓使用者自己按 Ctrl+C——這條不經過任何權限。③ 常駐一顆「顯示回覆文字（自己複製）」按鈕，不要等失敗才出現。已修 `assets/review-console-template.html`，並在 `validate_html.py` 加了機器檢查。更普遍的一課，跟這個技能已經記過的「靜默 no-op」是同一條：**失敗要說出來；宣稱成功卻沒成功，比明講失敗更貴**——使用者會拿著空剪貼簿去貼，然後懷疑整個工具。④ 修既有產出時，若使用者已經填過，**只能就地修補，不得改 DOC_ID／版本號／卡片 id／選項值**，否則他存在瀏覽器裡的草稿會整份消失。
### 2026-09-07 - 操作體驗與決策確認放在同一份 HTML
- Context: 使用者在本機軟體體驗台先操作功能、再於同頁決策，明確表示比過往分開的展示頁與確認台更好，並要求升格為公版。
- Preference: 新建軟體與主要流程改版預設使用綜合台；第一區能走完主要工作，第二區保留八節決策。試用、未保存草稿、已保存意見分開，推薦不得預選。
- Apply next time: 使用 `assets/integrated-review-workbench-template.html`；重設操作資料不得清除決策，API 成功後才顯示保存成功，409 保留草稿。只有沒有合理操作面時才使用獨立確認台。

### 2026-09-08 - 讀程式與操作頁面抓到的是不同種類的缺陷
- Preference: 中心知識庫後台改版時派了兩份獨立驗收：一份只讀程式（紅隊），一份把頁面開起來照使用者流程走完。兩邊的交集是零。紅隊抓到的是資料層的（存檔後洗掉指定名單、寫檔失敗但記憶體已生效、scope fail-open）；操作驗收抓到的是版面層的（CSS class 撞到全站的 display:flex，整列變 flexbox、表頭飄開 500px，而元素本身看起來完全正常）。後端 selftest 當時 145 項全綠，證明不了任何一項。教訓：有畫面的功能，驗收一定要包含真的把它開起來操作一遍，而且對齊要用 getBoundingClientRect 量座標——截圖上看起來『大致對齊』，實測差半個表格寬。另一條：全站 CSS 沒有命名空間時，新元件的 class 取名前先搜過既有樣式表，撞到 display 的那種最兇，因為畫面不會壞掉、只是換了一套排版。

### 2026-09-09 - 驗證器靜默跳過檢查，全綠不等於都驗過
- Preference: 月報操作台交付時 validate 印 26/26 全綠，另一份同類產出是 34/34——差的 8 項不是功能多寡，是 validate_html.py 的 _check_deps 在找不到 data-when/data-do 時直接 return，_check_counts 在標題沒宣告則數時不建立檢查項，於是那 8 項靜默消失、總項數跟著縮水。結果是：花工夫建的依賴圖（兩條真實依賴）一個字都沒被機器驗過，而那組檢查存在的唯一理由正是防止打錯 id 造成『錯誤的規則把該問的題滅音』。教訓：一個會靜默跳過檢查的守門員，本身就是它在防的那種 fail-open。已修 validate_html.py：新增 Report.skip()，早退點改為登記被跳過的項目名稱與原因，render 印 [SKIP] 明細，摘要行另印『總項數 N 之中只驗了 M 項』。交付前要看的不只是 n/n 全綠，還要看 n 本身是多少。連帶：連動規則一律用 data-when/data-do，不要自創屬性名，否則等於沒寫。

### 2026-09-17 - 跨 AI 交付用固定檔名交付區＋機器驗收報告對接
- Preference: 貓頭鷹考前網（2026-09-17）：GPT Codex 產 71 件美術、Claude 建站。兩個 AI 沒有通話管道，改用「交付區固定檔名 → 驗收腳本產 _驗收報告.md（通過／退件／缺件＋修法）→ 對方自己讀報告修」的檔案通道，負責人只需轉述一句。驗收腳本重跑要保留人工檢視段落。需要直接對話時可用 computer-use 打進 Codex 視窗，但會被輸入法或遠端桌面視窗擋住，擋住就回檔案通道。

### 2026-09-17 - 驗收規則先跟委託人對齊，不把自己的美學當紅線
- Preference: 貓頭鷹考前網：AI 依舊美術設定稿把「圖上不得有文字、不要中央撞擊」寫進委託書與驗收器並退件，委託人其實要科目牌（旁觀者看得懂）與撞擊感（原稿核心）。教訓：任何會拿來退件的規則，寫進驗收器前先用一句話跟委託人確認；退件理由被推翻時在報告寫「撤回」而非刪除。

### 2026-09-17 - 子代理的截圖自檢會漏掉數值裁切，驗收方要親看全頁截圖
- Preference: 貓頭鷹考前網整站遊戲風 v2→v3.2 七輪：Sonnet 子代理每輪自稱截圖看過，仍漏掉面板 max-height 切掉三列、sprite 被 flex 壓成細條、緞帶文字浮在緞帶外。Fable 每輪親自讀全頁與近距離截圖並要求它列出 DOM 實測數值才抓到。另：使用者看實機，交付前預覽伺服器要重啟並附四行版本區塊；每次交付要說清楚是半成品還是可交付。

### 2026-10-01 - 「▶ 試給我看」升格為公版：每一題都要能跳到操作區實際跑
- Context: 共照服務管理系統正式版決策台 v2 被退（「太陽春，很多功能示範都無法呈現，我無法進行回答」）——那幾題（計數單位、資料夾命名、兩支程式、同案並行）靜態畫面根本看不出差別。v3 起每題附「▶ 試給我看」，按了切到操作區真的跑（切報表單位、改資料夾命名、模擬別人正在處理），加功能索引與一鍵導覽；v4 延續。使用者在 v4 回覆裡寫：「不確定怎麼選然後可以跳示範這裡，就是我要的……希望寫入 HTML SKILL 變成既定、公版，AI 就是應該要這樣跟我合作。」
- Preference: 綜合台每一張必答卡都要有試用列；示範要真的改變畫面並用泡泡說明在看什麼；示範只動操作資料、記入試用紀錄，不碰決策。
- Apply next time: 骨架 `assets/integrated-review-workbench-template.html` 已內建試用列、功能索引、導覽泡泡與 `DEMOS`／`FN` 兩張表；`validate_html.py` 新增「每一題必答卡都有 data-demo」檢查（好壞各驗過：拿掉 W2 的示範鈕會 FAIL 並指名）。寫題目時先問自己「這題按下去能跑給他看什麼」——答不出來，代表題目還沒準備好。
