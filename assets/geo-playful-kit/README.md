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
- `tools/`：後製腳本（`process_assets.py` 切拼圖、去背、改色、壓縮；`write_docs.py` 產生 manifest 與說明）。用法：`python tools/process_assets.py <image_gen 產出資料夾>`。
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
.icon-search { background-image: url("data:image/png;base64,..."); }
```

## 新增顏色或圖示

新增 marker 色系可用既有 `marker_coral.png` 改色，形狀需保持一致。新增圖示時沿用拼圖做法：一次生成 4x4，格與格之間大量留白，再切格、去背、置中、壓縮。

可直接貼給 image_gen 的風格提示詞：

```text
Create one square image containing exactly 16 separate icon subjects in a perfectly even 4 by 4 grid, wide gutters, cream background. Style: modern flat geometric playful soft 3D vector-like illustration, rounded circles, capsules, semicircles, clean saturated color blocks, cute simplified shapes, soft shadows. Palette: coral #FF6B6B, mint #1FBFA8, sun #FFC24B, sky #3DA5F5, lavender #A77BEA, ink #2D251A, cream #FFF9F2. Constraints: no text, no letters, no numbers, no logos, no trademarks, no watermark. Each icon centered, not touching cell edges, readable at 32x32.
```

## 驗收摘要

- 圖片素材大小：1.67 MB。
- 全資料夾目前大小：約 5.67 MB。
- `manifest.json`：168 筆。
- 32px 對照圖：`_check/icons_32.png`。
