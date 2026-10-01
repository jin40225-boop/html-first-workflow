#!/usr/bin/env python3
"""交付前驗證單檔 HTML 是否符合 html-first-workflow 的硬性規格。

用法：
    python validate_html.py <檔案.html> [更多檔案...]
    python validate_html.py <檔案.html> --type workbench|console|demo|auto

為什麼要有這支：這個技能的三次失敗（內容被 JavaScript 擋掉、選項沒寫影響與代價、
規則過期還在模板裡）全都是「AI 自認完成」的產物。自評表擋不住長會話尾段的偷懶，
所以能機器判定的項目一律交給機器。

輸出最後一行就是要貼進交付訊息的那一行，例如：
    validate: PASS (14/14) — 協作確認台_P1啟動_v1.html
沒貼那一行＝沒交付。
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# 確認台骨架自帶的佔位值，複製後沒改就會跟上一個專案共用瀏覽器草稿
SAMPLE_DOC_IDS = {"PROJECT-ID-CHANGE-ME", "html-dual-track-skill"}

SCRIPT_BLOCK = re.compile(r"<script\b[^>]*>.*?</script>", re.S | re.I)
STYLE_BLOCK = re.compile(r"<style\b[^>]*>.*?</style>", re.S | re.I)
TAG = re.compile(r"<[^>]+>")
COMMENT = re.compile(r"<!--.*?-->", re.S)


class Report:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.rows: list[tuple[str, bool, str]] = []
        self.skipped: list[tuple[str, str]] = []

    def check(self, name: str, ok: bool, detail: str = "") -> None:
        self.rows.append((name, ok, detail))

    def skip(self, names: list[str], why: str) -> None:
        """檢查沒跑就要說出來。

        沒有這個方法之前，早退的檢查會靜默消失，總項數跟著縮水，
        而 26/26 與 34/34 都印成「全綠」——一個會靜默跳過檢查的驗證器，
        本身就是它在防的那種 fail-open。
        """
        for n in names:
            self.skipped.append((n, why))

    @property
    def failed(self) -> list[tuple[str, bool, str]]:
        return [r for r in self.rows if not r[1]]

    def render(self) -> str:
        lines = [f"── {self.path.name} ──"]
        for name, ok, detail in self.rows:
            mark = "PASS" if ok else "FAIL"
            lines.append(f"  [{mark}] {name}" + (f" → {detail}" if detail and not ok else ""))
        for name, why in self.skipped:
            lines.append(f"  [SKIP] {name} " + "→" + f" {why}")
        return "\n".join(lines)


def visible_text_without_js(html: str) -> str:
    """把 <script> 整段拿掉之後，頁面還剩多少看得到的文字。

    這是「靜態優先」的實測：沙箱檢視器不執行 JS 時，使用者看到的就是這些。
    """
    body = html
    m = re.search(r"<body\b[^>]*>(.*)</body>", html, re.S | re.I)
    if m:
        body = m.group(1)
    body = SCRIPT_BLOCK.sub(" ", body)
    body = STYLE_BLOCK.sub(" ", body)
    body = COMMENT.sub(" ", body)
    body = TAG.sub(" ", body)
    return re.sub(r"\s+", " ", body).strip()


def detect_kind(html: str) -> str:
    if 'data-zone="experience"' in html and 'data-zone="review"' in html and 'data-sec="' in html:
        return "workbench"
    if 'data-sec="' in html and 'data-m="ok"' in html:
        return "console"
    if "離線示範" in html or "均為虛構" in html:
        return "demo"
    return "generic"


# 八節順序＝三幕劇，使用者 2026-08-15 裁決，不可調換
SECTION_ORDER = ["understand", "now", "plan", "spec", "conflict", "ask", "decide", "cost"]

ARTICLE = re.compile(r'<article[^>]*class="card"[^>]*data-id="([^"]+)"(.*?)</article>', re.S)
DEP = re.compile(r'<div class="dep"[^>]*data-when="([^"]*)"[^>]*data-do="([^"]*)"[^>]*>(.*?)</div>', re.S)
OPT = re.compile(r'name="opt-([^"]+)"\s+value="([^"]+)"')
TERM = re.compile(r"^([^:!]+)([:!])(.+)$")


def _check_counts(rep: Report, html: str) -> None:
    """標題列宣稱的則數必須等於實際卡片數。

    這條是被真實錯誤逼出來的：曾經產出一份寫著「11 則、5 則需要你回答」的確認台，
    實際上是 12 則、6 則。使用者無從查證，只能相信標題——所以交給機器數。
    """
    head = html[: html.find("</header>")] if "</header>" in html else html[:4000]
    total = len(re.findall(r'<article[^>]*class="card"', html))
    need = len(re.findall(r'data-need="1"', html))

    m = re.search(r"共\s*(\d+)\s*則", head)
    if m:
        rep.check("標題宣稱的則數＝實際卡片數", int(m.group(1)) == total,
                  f"標題寫 {m.group(1)}，實際 {total}")
    else:
        rep.skip(["標題宣稱的則數＝實際卡片數"],
                 f"標題沒有宣告則數（實際 {total} 則），這項檢查無從比對")
    m = re.search(r"(\d+)\s*則標?「?需要你回答", head)
    if m:
        rep.check("標題宣稱的必答數＝實際必答數", int(m.group(1)) == need,
                  f"標題寫 {m.group(1)}，實際 {need}")
    else:
        rep.skip(["標題宣稱的必答數＝實際必答數"],
                 f"標題沒有宣告必答數（實際 {need} 則），這項檢查無從比對")


def _check_sections(rep: Report, html: str) -> None:
    """八節必須齊、且順序正確——順序錯了，使用者會被要求在看到計畫之前先拍板。"""
    found = re.findall(r'<section[^>]*data-sec="([^"]+)"', html)
    missing = [s for s in SECTION_ORDER if s not in found]
    rep.check("八節齊全", not missing, "缺：" + "、".join(missing))
    ordered = [s for s in found if s in SECTION_ORDER]
    rep.check(
        "八節順序正確（理解→現況→計畫→規格→矛盾→提問→決策→成本）",
        ordered == SECTION_ORDER,
        "目前順序：" + "→".join(ordered),
    )


DEP_CHECKS = ["連動目標卡存在", "連動條件的選項值存在", "每條連動規則都寫了人話理由",
              "recommend 指向本卡實際存在的選項", "連動無循環", "無單卡集群"]


def _check_deps(rep: Report, html: str) -> None:
    """連動規則的形式檢查。機器只能驗形不能驗意，但打錯字造成的滅音全部擋得住。"""
    cards = {cid: body for cid, body in ARTICLE.findall(html)}
    if not cards:
        rep.skip(DEP_CHECKS, "找不到任何 data-id 卡片，連動檢查全部沒跑")
        return
    opts: dict[str, set[str]] = {}
    for cid, val in OPT.findall(html):
        opts.setdefault(cid, set()).add(val)

    edges: list[tuple[str, str]] = []          # (上游, 下游) 只計 mute
    bad_target, bad_val, no_reason, bad_rec = [], [], [], []
    has_dep = False

    for owner, body in cards.items():
        for when, do, reason in DEP.findall(body):
            if "{{" in when or "{{" in do:      # 骨架佔位，跳過
                continue
            has_dep = True
            if not re.sub(r"<[^>]+>", "", reason).strip():
                no_reason.append(f"{owner}:{when}")
            for term in when.split("+"):
                m = TERM.match(term.strip())
                if not m:
                    bad_target.append(f"{owner}→條件式寫錯：{term}")
                    continue
                tid, _, vals = m.groups()
                tid = tid.strip()
                if tid not in cards:
                    bad_target.append(f"{owner}→{tid}（卡片不存在）")
                    continue
                unknown = set(v.strip() for v in vals.split("|")) - opts.get(tid, set())
                if unknown:
                    bad_val.append(f"{owner}→{tid}:{'|'.join(sorted(unknown))}")
                if do == "mute":
                    edges.append((tid, owner))
            if do.startswith("recommend:") and do[10:] not in opts.get(owner, set()):
                bad_rec.append(f"{owner}:{do}")

    if not has_dep:
        rep.skip(DEP_CHECKS,
                 "沒有任何 data-when／data-do 連動規則；若頁面其實有依賴關係，"
                 "代表它是用別的屬性名寫的，這 6 項一個字都沒被驗過")
        return

    rep.check("連動目標卡存在", not bad_target, "、".join(bad_target))
    rep.check("連動條件的選項值存在", not bad_val, "、".join(bad_val))
    rep.check("每條連動規則都寫了人話理由", not no_reason, "、".join(no_reason))
    rep.check("recommend 指向本卡實際存在的選項", not bad_rec, "、".join(bad_rec))

    graph: dict[str, set[str]] = {}
    for a, b in edges:
        graph.setdefault(a, set()).add(b)
    seen, stack = set(), set()

    def cyclic(node: str) -> bool:
        if node in stack:
            return True
        if node in seen:
            return False
        seen.add(node)
        stack.add(node)
        hit = any(cyclic(n) for n in graph.get(node, ()))
        stack.discard(node)
        return hit

    rep.check("連動無循環", not any(cyclic(n) for n in list(graph)))

    clusters = re.findall(r'data-cluster="([^"]+)"', html)
    clusters = [c for c in clusters if "{{" not in c]
    lonely = sorted({c for c in clusters if clusters.count(c) == 1})
    rep.check("無單卡集群（一張卡自成一群等於沒分群）", not lonely, "、".join(lonely))


def validate(path: Path, kind: str) -> Report:
    html = path.read_text(encoding="utf-8", errors="replace")
    rep = Report(path)

    # 金標樣本（*.golden.html）是「擬真度」的參照物，不是交付物。
    # 它示範的是外殼細節與真的在做事，不是程式衛生——不套交付規則。
    if ".golden." in path.name:
        rep.check("金標樣本（僅供擬真度對照，不套交付規則）", True)
        return rep

    if kind == "auto":
        kind = detect_kind(html)

    # ── 1. 零外部相依（公司內網、無網路、嚴格 CSP 都會擋掉外部資源）
    external = []
    for pat, label in [
        (r"<script[^>]+src\s*=\s*[\"']https?:", "外部 script"),
        (r"<link[^>]+href\s*=\s*[\"']https?:", "外部 stylesheet"),
        (r"<img[^>]+src\s*=\s*[\"']https?:", "外部圖片"),
        (r"url\(\s*[\"']?https?:", "CSS 外部資源"),
        (r"@import\s+[\"']?https?:", "CSS @import"),
        (r"\bfetch\s*\(\s*[\"']https?:", "fetch 外部網址"),
    ]:
        if re.search(pat, html, re.I):
            external.append(label)
    rep.check("零外部相依", not external, "、".join(external))

    # ── 2. 靜態優先：把 JS 全部拿掉之後還讀不讀得到內容
    text = visible_text_without_js(html)
    floor = 1200 if kind in {"console", "workbench"} else 400
    rep.check(
        "靜態優先（關掉 JS 仍讀得到內容）",
        len(text) >= floor,
        f"移除 <script> 後只剩 {len(text)} 字，門檻 {floor}",
    )

    # ── 3. 沒有內聯事件屬性（嚴格 CSP 會擋掉，且不利維護）
    inline = sorted(set(re.findall(r"\son(?:click|change|input|submit|load)\s*=", html, re.I)))
    rep.check("無內聯事件屬性", not inline, "、".join(x.strip() for x in inline))

    # ── 4. 響應式與列印
    rep.check("有 viewport meta", bool(re.search(r'<meta[^>]+name\s*=\s*["\']viewport', html, re.I)))
    rep.check("有列印樣式 @media print", "@media print" in html)

    # ── 5. 深淺色：body 必須明確指定背景色，否則在深色檢視器裡會透出host背景
    rep.check("深色模式有定義", "prefers-color-scheme" in html)
    rep.check(
        "body 有明確背景色",
        bool(re.search(r"\bbody\s*\{[^}]*background", html, re.I)),
    )

    # ── 6. 個資紅線
    ids = sorted(set(re.findall(r"\b[A-Z][12]\d{8}\b", html)))
    rep.check("無身分證字號格式", not ids, "、".join(ids[:5]))

    phones = [p for p in re.findall(r"\b09\d{8}\b", html) if p[4:7] != "000"]
    rep.check(
        "無可能撞到真人的手機號（中間三碼須為 000）",
        not phones,
        "、".join(sorted(set(phones))[:5]),
    )

    # ── 7. 依類型的專屬檢查
    if kind in {"console", "workbench"}:
        rep.check("互動元件預設隱藏（.jsonly）", ".jsonly" in html and re.search(r"\.jsonly\s*\{[^}]*display\s*:\s*none", html, re.I) is not None)
        # 有 JS 時要真的顯示回來。清 inline style（el.style.display=""）是清不掉 class 規則的：
        # .jsonly{display:none} 只要排在 .tools/.progress/.filters 之後就永遠贏，整條工具列會消失。
        rep.check(
            "有 JS 時 .jsonly 會真的顯示回來（必須移除 class，不能只清 inline style）",
            re.search(r'\.jsonly["\']\s*\)\s*\.forEach\s*\(\s*\w+\s*=>\s*\w+\.classList\.remove\(\s*["\']jsonly["\']', html) is not None,
            "找到的是 style.display=\"\" 這種寫法" if re.search(r'\.jsonly["\']\s*\)\s*\.forEach\s*\(\s*\w+\s*=>\s*\w+\.style\.display', html) else "找不到開啟 .jsonly 的程式碼",
        )
        rep.check("有無 JS 時的替代說明", "hintNoJS" in html or "沒有執行互動功能" in html)
        # 骨架本身就該留佔位值，只有實際產出物才檢查
        if "-template" not in path.name:
            doc_ids = re.findall(r'DOC_ID\s*=\s*["\']([^"\']+)["\']', html)
            bad = [d for d in doc_ids if d in SAMPLE_DOC_IDS]
            rep.check("DOC_ID 已改成本案專屬", bool(doc_ids) and not bad,
                      f"仍是骨架佔位值 {bad}" if bad else "找不到 DOC_ID")
        rep.check("每個選項都有「影響」", html.count("→ 影響") >= html.count('class="opt"') - 1 if 'class="opt"' in html else True)
        rep.check("每個選項都有「代價」", html.count("代價：") >= html.count('class="opt"') - 1 if 'class="opt"' in html else True)
        rep.check("有匯出與複製兩條回收路徑", "btnExport" in html and "btnCopy" in html)
        # execCommand("copy") 被擋時回傳 false 而不丟例外。不檢查回傳值就會「說已複製、其實沒複製」，
        # 使用者填完一整頁卻貼不出東西。必須有一條不依賴剪貼簿與下載的退路（把文字攤在頁面上讓人自己選）。
        rep.check(
            "複製失敗有不依賴剪貼簿的退路（不得靜默宣稱已複製）",
            re.search(r'execCommand\(\s*["\']copy["\']\s*\)\s*;?\s*done', html) is None
            and "showManual" in html and 'id="manual"' in html,
            "execCommand 的回傳值沒被檢查就呼叫 done()" if re.search(r'execCommand\(\s*["\']copy["\']\s*\)\s*;?\s*done', html) else "找不到手動複製退路（showManual／#manual）",
        )
        _check_counts(rep, html)
        _check_sections(rep, html)
        _check_deps(rep, html)

    if kind == "workbench":
        # 使用者 2026-10-01 明定：每一題都要有「▶ 試給我看」，按了跳到操作區實際跑一次。
        # v2 曾因「題目示範不出來」讓使用者無從回答；v3 起每題可跑，他說這就是要的合作方式。
        # data-need 可能寫在 data-id 前或後，所以看整張卡的開標籤
        no_demo = [m.group(1) for m in ARTICLE.finditer(html)
                   if 'data-need="1"' in m.group(0)[: m.group(0).find(">") + 1]
                   and 'data-demo="' not in m.group(0)]
        rep.check("每一題必答卡都有「▶ 試給我看」（data-demo）", not no_demo, "缺：" + "、".join(no_demo))
        practice_key = re.search(r"PRACTICE_KEY\s*=\s*([^,;]+)", html)
        reply_key = re.search(r"REPLY_KEY\s*=\s*([^,;]+)", html)
        rep.check(
            "操作體驗與決策確認位於同一份 HTML",
            'data-zone="experience"' in html and 'data-zone="review"' in html,
        )
        rep.check(
            "操作資料與決策回覆使用不同儲存鍵",
            practice_key is not None and reply_key is not None
            and practice_key.group(1).strip() != reply_key.group(1).strip(),
        )
        rep.check(
            "試用、草稿與已保存意見分開呈現",
            all(term in html for term in ("試用", "未保存草稿", "已保存")),
        )
        rep.check(
            "每題另有保存動作",
            "data-save=" in html and ("保存本題" in html or "儲存本題" in html),
        )
        prechecked = re.findall(r'<input[^>]+type=["\']radio["\'][^>]+checked(?:\s|=|>)', html, re.I)
        rep.check("推薦選項沒有預先勾選", not prechecked, f"找到 {len(prechecked)} 個預選 radio")
        rep.check(
            "試用不等於核准的說明存在",
            "試用" in html and ("不代表核准" in html or "不會" in html and "已保存意見" in html),
        )
        rep.check(
            "重設操作資料不會清除決策回覆",
            "removeItem(PRACTICE_KEY)" in html and "removeItem(REPLY_KEY)" not in html,
        )

    if kind == "demo":
        rep.check("有虛構資料聲明", "均為虛構" in html)
        rep.check("有離線示範標示", "離線示範" in html)

    return rep


def main() -> int:
    ap = argparse.ArgumentParser(description="驗證單檔 HTML 是否符合 html-first-workflow 規格")
    ap.add_argument("files", nargs="+", type=Path)
    ap.add_argument("--type", dest="kind", default="auto",
                    choices=["auto", "workbench", "console", "demo", "generic"],
                    help="不指定就自動判斷")
    args = ap.parse_args()

    reports: list[Report] = []
    for path in args.files:
        if not path.exists():
            print(f"FAIL: 找不到檔案 {path}")
            return 2
        reports.append(validate(path, args.kind))

    for rep in reports:
        print(rep.render())
        print()

    total = sum(len(r.rows) for r in reports)
    bad = sum(len(r.failed) for r in reports)
    skipped = sum(len(r.skipped) for r in reports)
    names = "、".join(r.path.name for r in reports)
    tail = f"，另有 {skipped} 項未執行／應跑 {total + skipped}" if skipped else ""
    if skipped:
        print(f"！有 {skipped} 項檢查沒有執行（見上方 SKIP）。"
              f"總項數 {total + skipped} 之中只驗了 {total} 項——"
              f"「全綠」不等於「都驗過」，先看分母再看比例。")
    if bad:
        print(f"validate: FAIL ({total - bad}/{total}{tail}) — {names}")
        print("修好之後重跑。未通過不得交付。")
        return 1
    print(f"validate: PASS ({total}/{total}{tail}) — {names}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
