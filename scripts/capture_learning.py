#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
from pathlib import Path


SKILL_DIR = Path(__file__).resolve().parents[1]
GROWTH_FILE = SKILL_DIR / "references" / "growth-memory.md"


def main() -> int:
    parser = argparse.ArgumentParser(description="Append a durable design/build lesson.")
    parser.add_argument("title")
    parser.add_argument("lesson")
    parser.add_argument("--context", default="")
    parser.add_argument("--apply", default="")
    args = parser.parse_args()

    today = dt.date.today().isoformat()
    entry = [f"\n### {today} - {args.title}\n"]
    if args.context:
        entry.append(f"- Context: {args.context}\n")
    entry.append(f"- Preference: {args.lesson}\n")
    if args.apply:
        entry.append(f"- Apply next time: {args.apply}\n")

    GROWTH_FILE.parent.mkdir(parents=True, exist_ok=True)
    with GROWTH_FILE.open("a", encoding="utf-8") as handle:
        handle.writelines(entry)
    print(f"Appended learning to {GROWTH_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
