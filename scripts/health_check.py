#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re
import sys


SKILL_DIR = Path(__file__).resolve().parents[1]


def fail(message: str) -> int:
    print(f"FAIL: {message}")
    return 1


# 公開發佈的紅線：個資、真實地名、真實單位／人名。技術內容不在此列。
FORBIDDEN = {
    "真實單位或人名": r"白露|whitedew|彥宇|剴剴|珍珠社",
    # 逐一列舉使用者實際服務轄區的地名。整份全台行政區列舉（如 types.ts 的 Region）
    # 是公開資料也是型別契約，所以用「縣市名不接『市』」把它排除掉。
    "真實地名": r"金門縣|板橋區|西屯區|莒光路|頭份|苗栗市|苗栗縣(?!市)|中正路\d",
    "身分證字號樣態": r"(?<![A-Za-z])[A-Z][12]\d{8}(?!\d)",
    "未遮罩的手機號": r"09\d{2}(?!000)\d{6}",
    "真實網域信箱": r"[\w.+-]+@(?!example\.(org|com))[\w-]+\.(org|com|tw|net)",
}

SKIP_DIRS = {".git", "__pycache__", "node_modules"}


def is_obvious_dummy_id(value: str) -> bool:
    """A123456789 這類教科書假號放行；看起來像真人的才擋。

    判準是「亂度低到不可能是隨機發出的證號」：連號、或整串只用三種以內的數字。
    """
    digits = value[1:]
    if any(run in digits for run in ("123456", "234567", "345678", "456789")):
        return True
    return len(set(digits)) <= 3


def scan_identifying_terms() -> list[str]:
    """回傳 '類別 · 相對路徑:行號 · 命中內容' 的清單；空清單代表乾淨。"""
    hits: list[str] = []
    for path in sorted(SKILL_DIR.rglob("*")):
        if not path.is_file() or SKIP_DIRS & set(path.parts):
            continue
        if path.name == "health_check.py":  # 紅線清單本身會命中自己
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, PermissionError, OSError):
            continue
        for label, pattern in FORBIDDEN.items():
            for match in re.finditer(pattern, content):
                if label == "身分證字號樣態" and is_obvious_dummy_id(match.group(0)):
                    continue
                line = content.count("\n", 0, match.start()) + 1
                hits.append(f"{label} · {path.relative_to(SKILL_DIR)}:{line} · {match.group(0)}")
    return hits


def main() -> int:
    skill_file = SKILL_DIR / "SKILL.md"
    if not skill_file.exists():
        return fail("SKILL.md is missing")

    text = skill_file.read_text(encoding="utf-8")
    frontmatter_match = re.match(r"^---\n(.*?)\n---\n", text, flags=re.S)
    if not frontmatter_match:
        return fail("SKILL.md is missing YAML frontmatter")

    frontmatter = frontmatter_match.group(1)
    if "description:" not in frontmatter:
        return fail("frontmatter is missing description")

    required_paths = [
        # 這個技能的五個新支柱
        "references/review-console.md",
        "references/client-demo.md",
        "references/cost-and-tradeoffs.md",
        "references/delivery-resilience.md",
        "assets/review-console-template.html",
        "assets/client-demo-template.html",
        # 自舊技能沿用
        "references/project-intake.md",
        "references/architecture-logic.md",
        "references/frontend-product-design.md",
        "references/component-system.md",
        "references/quality-validation.md",
        "references/growth-memory.md",
        "scripts/project_snapshot.py",
        "scripts/capture_learning.py",
        "scripts/validate_html.py",
        # 自帶元件庫（換機／換人時不必從頭找元件的依據）
        "library/INDEX.md",
        "library/ui/F-UI-001_暖色設計token/tokens.css",
        "library/ui/F-UI-006_設計系統規格預覽/colors_and_type.css",
    ]
    missing = [path for path in required_paths if not (SKILL_DIR / path).exists()]
    if missing:
        return fail("missing supporting files: " + ", ".join(missing))

    if "library/INDEX.md" not in text:
        return fail("SKILL.md 沒有指向 library/INDEX.md，元件庫等於沒放")

    leaked = scan_identifying_terms()
    if leaked:
        return fail("含未去識別化內容，不得公開發佈：\n  " + "\n  ".join(leaked))

    print(f"Skill health check passed: {SKILL_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
