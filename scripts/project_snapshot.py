#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
from pathlib import Path


IGNORE_DIRS = {
    ".git",
    ".hg",
    ".svn",
    ".next",
    ".nuxt",
    ".svelte-kit",
    "node_modules",
    "dist",
    "build",
    "out",
    "target",
    "__pycache__",
    ".pytest_cache",
    ".venv",
    "venv",
    "env",
    ".cache",
    "coverage",
}

KEY_FILES = [
    "package.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "package-lock.json",
    "pyproject.toml",
    "requirements.txt",
    "pytest.ini",
    "vite.config.ts",
    "vite.config.js",
    "next.config.js",
    "next.config.mjs",
    "tsconfig.json",
    "tailwind.config.js",
    "tailwind.config.ts",
    "README.md",
]


def read_text(path: Path) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp950"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    return path.read_text(errors="replace")


def rel(path: Path, root: Path) -> str:
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def ignored_path(path: Path) -> bool:
    for part in path.parts:
        if part in IGNORE_DIRS or part.startswith("pytest-cache-files-"):
            return True
    return False


def walk_files(root: Path, max_files: int) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*"):
        if ignored_path(path):
            continue
        if path.is_file():
            files.append(path)
        if len(files) >= max_files:
            break
    return sorted(files)


def root_dirs(root: Path) -> list[str]:
    dirs = []
    for path in sorted(root.iterdir()):
        if path.is_dir() and not ignored_path(path):
            dirs.append(path.name)
    return dirs


def package_summary(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        data = json.loads(read_text(path))
    except Exception:
        return {"error": "could not parse package.json"}
    return {
        "name": data.get("name"),
        "scripts": data.get("scripts", {}),
        "dependencies": sorted((data.get("dependencies") or {}).keys()),
        "devDependencies": sorted((data.get("devDependencies") or {}).keys()),
    }


def extract_symbols(files: list[Path], root: Path) -> list[str]:
    output: list[str] = []
    route_re = re.compile(r"(app|router|api)\.(get|post|put|patch|delete)\(['\"]([^'\"]+)")
    py_route_re = re.compile(r"@(?:app|api|router)\.route\(([^)]+)\)")
    component_re = re.compile(r"^(?:export\s+default\s+)?(?:function|const)\s+([A-Z][A-Za-z0-9_]*)")
    for path in files:
        if path.suffix.lower() not in {".js", ".jsx", ".ts", ".tsx", ".py"}:
            continue
        text = read_text(path)
        hits: list[str] = []
        for match in route_re.finditer(text):
            hits.append(f"{match.group(2).upper()} {match.group(3)}")
        for match in py_route_re.finditer(text):
            hits.append(f"route {match.group(1).strip()}")
        for line in text.splitlines()[:300]:
            match = component_re.match(line.strip())
            if match:
                hits.append(f"component {match.group(1)}")
        if hits:
            output.append(f"- `{rel(path, root)}`: {', '.join(hits[:12])}")
    return output


def markdown(root: Path, max_files: int) -> str:
    files = walk_files(root, max_files=max_files)
    stamp = dt.datetime.now().astimezone().isoformat(timespec="seconds")
    lines: list[str] = [
        "# Project Snapshot",
        "",
        f"Generated: `{stamp}`",
        "",
        f"Root: `{root}`",
        "",
        "## Top-Level Folders",
        "",
    ]
    lines.extend(f"- `{name}`" for name in root_dirs(root))
    lines.append("")

    lines.append("## Key Files")
    lines.append("")
    for name in KEY_FILES:
        path = root / name
        if path.exists():
            lines.append(f"- `{name}`")
    lines.append("")

    pkg = package_summary(root / "package.json")
    if pkg:
        lines.append("## package.json Summary")
        lines.append("")
        lines.append("```json")
        lines.append(json.dumps(pkg, indent=2, ensure_ascii=False))
        lines.append("```")
        lines.append("")

    lines.append("## File Tree")
    lines.append("")
    for path in files:
        lines.append(f"- `{rel(path, root)}`")
    lines.append("")

    symbols = extract_symbols(files, root)
    if symbols:
        lines.append("## Detected Routes And Components")
        lines.append("")
        lines.extend(symbols)
        lines.append("")

    lines.append("## Intake Notes")
    lines.append("")
    lines.append("- Product purpose:")
    lines.append("- Main users:")
    lines.append("- Architecture:")
    lines.append("- Primary workflow:")
    lines.append("- Components:")
    lines.append("- Data/API:")
    lines.append("- Risks:")
    lines.append("- Verification:")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a concise software/web project snapshot.")
    parser.add_argument("project_root")
    parser.add_argument("--output", "-o")
    parser.add_argument("--max-files", type=int, default=220)
    args = parser.parse_args()

    root = Path(args.project_root).resolve()
    content = markdown(root, args.max_files)
    if args.output:
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(content, encoding="utf-8")
    else:
        print(content)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
