import argparse
import csv
import re
from pathlib import Path
from collections import Counter


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--inventory-root', required=True, help='Path to vba_inventory_export folder')
    return p.parse_args()


def tokenize(text: str):
    return re.findall(r'[A-Za-z_\u4e00-\u9fff][A-Za-z0-9_\u4e00-\u9fff]*', text.lower())


def category_from_text(text: str):
    t = text.lower()
    if 'runsync' in t or 'sync_run_log' in t:
        return '總表-子表同步'
    if '執行匯入程序' in text or '建立新個案' in text:
        return '匯入主流程/案件異動'
    if 'dropdown' in t or 'validation' in t or '重置' in text:
        return '表單重置/下拉選單'
    if '分析開始' in text or 'getmatch' in t:
        return '原始文字解析'
    if '派案' in text or '分級' in text:
        return '派案/分級'
    if '核對' in text or '儀錶板' in text or '報表' in text:
        return '核對/儀表板/報表'
    return '其他'


def time_hints(text: str):
    hints = set()
    hints |= set(re.findall(r'\b20\d{2}[/-]\d{1,2}[/-]\d{1,2}\b', text))
    hints |= set(re.findall(r'\bV\d+(?:\.\d+)?\b', text, flags=re.I))
    hints |= set(re.findall(r'\b115\d{4}\b', text))
    return '、'.join(sorted(hints)[:8])


def proc_count(text: str):
    return len(re.findall(r'^\s*(Public|Private|Friend)?\s*(Sub|Function)\s+[A-Za-z_\u4e00-\u9fff][A-Za-z0-9_\u4e00-\u9fff]*', text, flags=re.M))


def jaccard(counter_a: Counter, counter_b: Counter):
    set_a = set(counter_a.keys())
    set_b = set(counter_b.keys())
    if not set_a and not set_b:
        return 1.0
    inter = len(set_a & set_b)
    union = len(set_a | set_b)
    return inter / union if union else 0.0


def main():
    args = parse_args()
    root = Path(args.inventory_root).expanduser().resolve()
    if not root.exists():
        raise SystemExit(f'inventory root not found: {root}')

    module_files = sorted([p for p in root.glob('*.bas') if p.name != '_components.csv'])
    inventory_rows = []
    token_cache = {}

    for m in module_files:
      text = m.read_text(encoding='utf-8-sig', errors='ignore')
      lines = text.count('\n') + (1 if text else 0)
      inventory_rows.append({
          'module': m.name,
          'lines': lines,
          'proc_count': proc_count(text),
          'category': category_from_text(text),
          'time_hints': time_hints(text)
      })
      token_cache[m.name] = Counter(tokenize(text))

    inv_csv = root / '_module_inventory.csv'
    with inv_csv.open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['module', 'lines', 'proc_count', 'category', 'time_hints'])
        w.writeheader()
        w.writerows(inventory_rows)

    sim_rows = []
    names = [r['module'] for r in inventory_rows]
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            a, b = names[i], names[j]
            sim_rows.append({'module_a': a, 'module_b': b, 'jaccard': f'{jaccard(token_cache[a], token_cache[b]):.4f}'})

    sim_csv = root / '_module_similarity.csv'
    with sim_csv.open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['module_a', 'module_b', 'jaccard'])
        w.writeheader()
        w.writerows(sim_rows)

    print(inv_csv)
    print(sim_csv)


if __name__ == '__main__':
    main()
