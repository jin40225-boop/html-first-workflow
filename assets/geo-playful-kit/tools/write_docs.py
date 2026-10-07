from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
total_bytes = sum(p.stat().st_size for p in ROOT.rglob("*") if p.is_file() and ".git" not in p.parts)
image_bytes = sum(p.stat().st_size for folder in ["icons", "characters", "spots", "decor", "markers", "backgrounds"] for p in (ROOT / folder).glob("*.png"))


def w(path: str, text: str) -> None:
    (ROOT / path).write_text(text.strip() + "\n", encoding="utf-8")


showcase = f"""
<!doctype html>
<html lang="zh-Hant" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>幾何活潑 UI 套組 v1</title>
  <link rel="stylesheet" href="ui/tokens.css">
  <link rel="stylesheet" href="ui/components.css">
  <style>
    .shell {{ max-width: 1180px; margin: 0 auto; padding: 24px; }}
    .hero {{ min-height: 320px; border-radius: 16px; background: var(--gp-paper) url("backgrounds/hero_blank.png") center/cover no-repeat; padding: 36px; display: grid; align-content: center; box-shadow: var(--gp-shadow-md); border: 1px solid var(--gp-line); }}
    .hero h1 {{ margin: 0 0 8px; font-size: clamp(28px, 5vw, 48px); line-height: 1.1; letter-spacing: 0; }}
    .hero p {{ max-width: 520px; margin: 0; color: var(--gp-muted); }}
    .section {{ margin-top: 32px; }}
    .section h2 {{ margin: 0 0 12px; font-size: var(--gp-text-xl); }}
    .demo-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }}
    .asset-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 12px; }}
    .asset-card {{ min-height: 150px; display: grid; place-items: center; gap: 8px; padding: 12px; border: 1px solid var(--gp-line); border-radius: 12px; background: var(--gp-paper); box-shadow: var(--gp-shadow-sm); }}
    .asset-card img {{ max-width: 86px; max-height: 86px; object-fit: contain; }}
    .asset-card small {{ color: var(--gp-muted); text-align: center; line-height: 1.3; overflow-wrap: anywhere; }}
    .asset-card[data-group="情境插畫"] img {{ max-width: 118px; max-height: 88px; }}
    .asset-card[data-group="背景"] img {{ max-width: 118px; max-height: 80px; }}
    .swatches {{ display: flex; flex-wrap: wrap; gap: 10px; }}
    .swatch {{ display: grid; gap: 6px; width: 126px; }}
    .swatch span {{ height: 46px; border-radius: 12px; box-shadow: var(--gp-shadow-sm); border: 1px solid var(--gp-line); }}
    .filterbar {{ position: sticky; top: 0; z-index: 2; padding: 12px 0; background: color-mix(in srgb, var(--gp-cream) 90%, transparent); backdrop-filter: blur(8px); }}
    @media (max-width: 720px) {{ .shell {{ padding: 14px; }} .hero {{ padding: 22px; background-position: 62% center; }} }}
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <h1>幾何活潑 UI 套組 v1</h1>
      <p>通用圖示、人物角色、情境插畫、背景與 CSS 元件。所有示範資料皆為通用占位，未含真實機構、專案或人名。</p>
      <div class="gp-row" style="margin-top:20px">
        <button class="gp-btn gp-btn--primary">主要動作</button>
        <button class="gp-btn gp-btn--ghost" id="themeToggle">切換深淺色</button>
      </div>
    </section>

    <section class="section">
      <h2>色票</h2>
      <div class="swatches">
        <div class="swatch"><span style="background:#FF6B6B"></span><strong>coral</strong><small>#FF6B6B</small></div>
        <div class="swatch"><span style="background:#1FBFA8"></span><strong>mint</strong><small>#1FBFA8</small></div>
        <div class="swatch"><span style="background:#FFC24B"></span><strong>sun</strong><small>#FFC24B</small></div>
        <div class="swatch"><span style="background:#3DA5F5"></span><strong>sky</strong><small>#3DA5F5</small></div>
        <div class="swatch"><span style="background:#A77BEA"></span><strong>lavender</strong><small>#A77BEA</small></div>
        <div class="swatch"><span style="background:#2D251A"></span><strong>ink</strong><small>#2D251A</small></div>
        <div class="swatch"><span style="background:#FFF9F2"></span><strong>cream</strong><small>#FFF9F2</small></div>
      </div>
    </section>

    <section class="section gp-stack">
      <h2>元件</h2>
      <div class="gp-card gp-card--marked">
        <h3>特殊標記卡片</h3>
        <p>外框換色並從頂端探出 marker，適合重要、置頂或需關注項目。</p>
        <div class="gp-row">
          <button class="gp-btn gp-btn--primary"><img src="icons/save.png" width="18" height="18" alt="">儲存</button>
          <button class="gp-btn gp-btn--secondary"><img src="icons/filter.png" width="18" height="18" alt="">篩選</button>
          <button class="gp-btn gp-btn--danger"><img src="icons/trash.png" width="18" height="18" alt="">移除</button>
          <span class="gp-chip" aria-pressed="true">已啟用</span>
          <span class="gp-badge">待處理</span>
        </div>
      </div>
      <div class="demo-grid">
        <div class="gp-card gp-stack">
          <h3>表單</h3>
          <label class="gp-field"><span class="gp-label">可填式下拉</span><input class="gp-select-input" list="demo-options" value="自訂項目"><datalist id="demo-options"><option value="一般"><option value="重要"><option value="待確認"></datalist></label>
          <label class="gp-field"><span class="gp-label">輸入框</span><input class="gp-input" placeholder="請輸入"></label>
          <label class="gp-check"><input type="checkbox" checked> 勾選狀態</label>
          <label class="gp-switch"><input type="checkbox" checked><span></span> 開關</label>
        </div>
        <div class="gp-card gp-stack">
          <h3>分頁與表格</h3>
          <div class="gp-tabs"><button class="gp-tab" aria-selected="true">總覽</button><button class="gp-tab">紀錄</button><button class="gp-tab">設定</button></div>
          <table class="gp-table"><thead><tr><th>項目</th><th>狀態</th></tr></thead><tbody><tr><td>範例 A</td><td><span class="gp-tag">完成</span></td></tr><tr><td>範例 B</td><td><span class="gp-tag" style="background:var(--gp-coral-soft);color:var(--gp-coral-deep)">重要</span></td></tr></tbody></table>
        </div>
        <div class="gp-card gp-stack">
          <h3>進度與能量條</h3>
          <div class="gp-progress" style="--value:68%"><span></span></div>
          <div class="gp-energy">
            <div class="gp-energy-row"><strong>成員一</strong><div class="gp-energy-track" style="--now:52%;--add:18%;--out-left:76%;--out:9%;--avg:64%"><div class="gp-energy-now"></div><div class="gp-energy-add"></div><div class="gp-energy-out"></div><div class="gp-energy-avg"></div></div><span>52%</span></div>
            <div class="gp-energy-row"><strong>成員二</strong><div class="gp-energy-track" style="--now:72%;--add:8%;--out-left:84%;--out:6%;--avg:64%"><div class="gp-energy-now"></div><div class="gp-energy-add"></div><div class="gp-energy-out"></div><div class="gp-energy-avg"></div></div><span>72%</span></div>
          </div>
        </div>
        <div class="gp-card gp-stack">
          <h3>空白狀態與對話</h3>
          <div class="gp-empty"><img src="spots/spot_empty.png" alt=""><p>目前沒有資料</p></div>
          <div class="gp-thread"><div class="gp-message">這是對方訊息。</div><div class="gp-message gp-message--me">這是我方訊息。</div></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="filterbar gp-row" id="filters"></div>
      <div id="assetSections"></div>
    </section>
  </main>
  <script id="asset-data" type="application/json">{json.dumps(manifest, ensure_ascii=False)}</script>
  <script>
    const data = JSON.parse(document.getElementById("asset-data").textContent);
    const groups = [...new Set(data.map(x => x.group))];
    const filters = document.getElementById("filters");
    const root = document.getElementById("assetSections");
    let active = "全部";
    function drawFilters() {{
      filters.innerHTML = ["全部", ...groups].map(g => `<button class="gp-btn gp-btn--sm ${{g===active?'gp-btn--primary':'gp-btn--ghost'}}" data-group="${{g}}">${{g}}</button>`).join("");
      filters.querySelectorAll("button").forEach(btn => btn.onclick = () => {{ active = btn.dataset.group; drawFilters(); drawAssets(); }});
    }}
    function drawAssets() {{
      root.innerHTML = "";
      groups.forEach(group => {{
        if (active !== "全部" && active !== group) return;
        const items = data.filter(x => x.group === group);
        const section = document.createElement("section");
        section.className = "section";
        section.innerHTML = `<h2>${{group}}</h2><div class="asset-grid">${{items.map(item => `<figure class="asset-card" data-group="${{group}}"><img loading="lazy" src="${{item.file}}" alt="${{item.name_zh}}"><small>${{item.name_zh}}<br>${{item.file}}</small></figure>`).join("")}}</div>`;
        root.append(section);
      }});
    }}
    document.getElementById("themeToggle").onclick = () => {{
      document.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    }};
    drawFilters();
    drawAssets();
  </script>
</body>
</html>
"""

w("showcase.html", showcase)

readme = f"""
# 幾何活潑萬用美術元件與 UI 介面套組 v1

這是一套可重複使用的通用素材包，風格是現代扁平幾何：圓形、膠囊、半圓、乾淨飽滿色塊、簡化可愛人物、點點、波浪線與短促閃光線。內容不綁定任何單一專案，檔名與說明未使用真實機構、專案或人名。

## 配色

| 名稱 | 色碼 | 用途 |
|---|---|---|
| coral | `#FF6B6B` | 強調、警示、重要 |
| mint | `#1FBFA8` | 成功、完成、確認 |
| sun | `#FFC24B` | 提醒、進行中、新增 |
| sky | `#3DA5F5` | 資訊、連結、主要動作 |
| lavender | `#A77BEA` | 特殊、標記、管理 |
| ink | `#2D251A` | 線條、文字 |
| cream | `#FFF9F2` | 背景 |

淺色與深色變體寫在 `ui/tokens.css`，深色模式支援 `@media (prefers-color-scheme: dark)` 與 `[data-theme="dark"]`。

## 資料夾

- `icons/`：96 個 256x256 通用圖示。
- `characters/`：16 個 512x512 人物角色。
- `spots/`：12 張 800x600 情境插畫。
- `decor/`：24 個 256x256 裝飾元素。
- `markers/`：5 個 marker 與 9 個 badge。
- `backgrounds/`：橫幅、首頁底圖、底紋、卡片角落。
- `ui/`：CSS tokens、元件樣式與 ECharts theme。
- `_sheets/`：image_gen 原始拼圖與來源圖。
- `_check/`：驗收圖，例如 `icons_32.png`。
- `manifest.json`：AI 查找素材用索引。
- `showcase.html`：可直接開啟的離線展示頁。

## 我要做 X → 用哪個

| 需求 | 建議素材 |
|---|---|
| 導覽列、工具列、按鈕 icon | `icons/` |
| 空狀態、錯誤、成功、等待頁 | `spots/` |
| 首頁、登入頁、橫幅 | `backgrounds/hero_blank.png`、`backgrounds/banner_blank_*.png` |
| 卡片重要標示 | `markers/marker_*.png` 搭配 `.gp-card--marked` |
| 狀態徽章 | `markers/badge_*.png` 或 `.gp-badge` |
| 人物式說明或歡迎區 | `characters/` |
| 背景點綴、分隔、角落裝飾 | `decor/`、`backgrounds/pattern_tile.png` |
| 表單、表格、分頁、能量條 | `ui/tokens.css` + `ui/components.css` |
| 圖表 | `ui/echarts-theme.js` |

## 在新專案引用

最小引用：

```html
<link rel="stylesheet" href="geo-playful-kit/ui/tokens.css">
<link rel="stylesheet" href="geo-playful-kit/ui/components.css">
```

使用圖片：

```html
<img src="geo-playful-kit/icons/search.png" alt="">
```

ECharts：

```html
<script src="echarts.min.js"></script>
<script src="geo-playful-kit/ui/echarts-theme.js"></script>
<script>
  const chart = echarts.init(document.getElementById("chart"), "geo-playful");
</script>
```

## 單檔離線 HTML 內嵌 data URI

將需要的圖片轉成 base64 後直接放入 HTML：

```powershell
$p = "icons/search.png"
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($p))
"data:image/png;base64,$b64"
```

CSS 也可改成：

```css
.icon-search {{ background-image: url("data:image/png;base64,..."); }}
```

## 新增顏色或圖示

新增 marker 色系可用既有 `marker_coral.png` 改色，形狀需保持一致。新增圖示時沿用拼圖做法：一次生成 4x4，格與格之間大量留白，再切格、去背、置中、壓縮。

可直接貼給 image_gen 的風格提示詞：

```text
Create one square image containing exactly 16 separate icon subjects in a perfectly even 4 by 4 grid, wide gutters, cream background. Style: modern flat geometric playful soft 3D vector-like illustration, rounded circles, capsules, semicircles, clean saturated color blocks, cute simplified shapes, soft shadows. Palette: coral #FF6B6B, mint #1FBFA8, sun #FFC24B, sky #3DA5F5, lavender #A77BEA, ink #2D251A, cream #FFF9F2. Constraints: no text, no letters, no numbers, no logos, no trademarks, no watermark. Each icon centered, not touching cell edges, readable at 32x32.
```

## 驗收摘要

- 圖片素材大小：{image_bytes / 1024 / 1024:.2f} MB。
- 全資料夾目前大小：約 {total_bytes / 1024 / 1024:.2f} MB。
- `manifest.json`：{len(manifest)} 筆。
- 32px 對照圖：`_check/icons_32.png`。
"""
w("README.md", readme)

response = f"""
# 回覆

## image_gen 提示詞紀錄

共使用 32 次 image_gen，其中 `hero_blank` 重生 1 次、`decor_02_shapes` 重生 1 次。重生前圖保留於 `_sheets/rejected/`。

### 拼圖母圖

- `icons_01_navigation_system.png`：4x4；首頁、搜尋、設定、選單、使用者、團隊、通知、說明、資訊、登出、鎖、鑰匙、盾牌、眼睛、重新整理、篩選。風格為 modern flat geometric playful soft 3D vector-like illustration；無文字、字母、數字、商標。
- `icons_02_files_data.png`：4x4；資料夾、文件、上傳、下載、列印、匯出、匯入、試算表、資料庫、雲端、連結、迴紋針、封存箱、垃圾桶、複製、剪貼簿。
- `icons_03_actions_status.png`：4x4；新增、編輯、完成、關閉、警告、錯誤、儲存、暫存、同步、排序、拖曳、展開、收合、星星、愛心、旗子。
- `icons_04_communication_time.png`：4x4；對話、雙對話、信封、電話、視訊、麥克風、公告、日曆、時鐘、鬧鐘、沙漏、行事曆勾、地圖釘、地圖、路線、車子。
- `icons_05_people_service.png`：4x4；家庭、長者、兒童、輪椅使用者、手牽手、握手、愛心手、房子、學校、醫療箱、藥丸、餐點、拐杖、志工背心、勳章、禮物；提示詞明確要求不要紅十字。
- `icons_06_work_analysis.png`：4x4；長條圖、圓餅圖、折線圖、表格、清單、看板、目標、獎盃、燈泡、火箭、拼圖、扳手、AI 閃光、機器人、問卷板、簽名筆。
- `characters_01_roles.png`：3x3；工作者、主管、長者、孩子、輪椅使用者、照顧者、家長牽孩子、志工，另 1 格備用；多元膚色、髮型、年齡與性別呈現。
- `characters_02_actions.png`：3x3；揮手、比讚、思考、慶祝、看筆電、指向右邊、困惑、睡覺，另 1 格備用；睡覺用月亮與泡泡，未使用 Z 字母。
- `decor_01_basic.png`：4x4；前 12 格為圓點群、波浪線、半圓、膠囊、閃光三條線、星芒、彩帶、圓角三角、弧線、小圓環、雲朵、葉子。
- `decor_02_shapes.png`：4x4；前 12 格為愛心泡泡、對話框、箭頭塗鴉、圓形印章框、4 種 blob、2 種角落花邊、2 種分隔線。
- `badges_01_status.png`：3x3；新、熱門、完成、待處理、重要、鎖定、草稿、置頂、已讀，全部用圖形表達。
- `marker_coral_source.png`：單張 coral 對話框小標籤，中央留白圓形；其餘四色由程式改色。

### 情境插畫

- `spot_empty.png`：空白資料，小人與空資料夾。
- `spot_no_results.png`：找不到結果，放大鏡與空卡片。
- `spot_success.png`：成功完成，mint 勾勾與彩帶。
- `spot_error.png`：出錯了，小人整理打結線。
- `spot_offline.png`：沒有網路，斷開的 Wi-Fi 與雲端。
- `spot_loading.png`：載入等待，小人與大沙漏。
- `spot_welcome.png`：歡迎第一次使用，2-3 人與門／視窗形狀。
- `spot_not_found.png`：找不到頁面，小人拿迷路地圖。
- `spot_no_permission.png`：沒有權限，上鎖的門。
- `spot_all_done.png`：全部處理完，空收件匣與小花。
- `spot_maintenance.png`：維護中，扳手與齒輪。
- `spot_syncing.png`：資料同步中，兩台電腦與雙箭頭。

### 背景

- `banner_blank_left.png`：左側 40% 角色家族與房子樹，右側留白。
- `banner_blank_right.png`：右側 40% 角色家族與房子樹，左側留白。
- `hero_blank.png`：右半插畫，左半留白；第一版左側太花，已重生。
- `pattern_tile.png`：淡色圓點、波浪、小星、膠囊，可作低干擾底紋。
- `card_corner_a.png`：左上角裝飾。
- `card_corner_b.png`：右下角裝飾。

## 重生紀錄

- `hero_blank`：第一版左側有過多淡色紋理，不適合排登入表單；重生為左半更乾淨的版本。
- `decor_02_shapes`：第一版前 12 格未覆蓋全部剩餘裝飾需求；重生後前 12 格對齊正式清單。

## 後處理

- 腳本：`tmp/process_assets.py`。
- 只做複製、等分切格、去背、清除小雜點、置中縮放、marker 改色、PNG 量化壓縮、manifest 與檢查圖。
- 產出圖片素材大小：{image_bytes / 1024 / 1024:.2f} MB。
- 全資料夾目前大小：約 {total_bytes / 1024 / 1024:.2f} MB。
"""
w("回覆.md", response)

print("wrote showcase.html README.md 回覆.md")
