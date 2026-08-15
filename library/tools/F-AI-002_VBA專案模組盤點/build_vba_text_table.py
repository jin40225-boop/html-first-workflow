import argparse
import csv
import re
from pathlib import Path


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--inventory-root', default='', help='Path to vba_inventory_export folder')
    p.add_argument('--project-root', default='', help='Path to project root folder')
    return p.parse_args()


def find_inventory_root(cli_value: str) -> Path:
    if cli_value:
        root = Path(cli_value).expanduser().resolve()
        if not root.exists():
            raise SystemExit(f'inventory root not found: {root}')
        return root

    desktop = Path.home() / 'Desktop'
    roots = list(desktop.glob('**/vba_inventory_export'))
    if not roots:
        raise SystemExit('vba_inventory_export not found')
    return roots[0]


def find_project_root(cli_value: str, inventory_root: Path) -> Path:
    if cli_value:
        return Path(cli_value).expanduser().resolve()

    parent = inventory_root.parent
    if parent.name == '05_自動化腳本與日誌':
        return parent.parent

    desktop = Path.home() / 'Desktop'
    proj_roots = list(desktop.glob('**/Excel VBA*'))
    if not proj_roots:
        raise SystemExit('project root not found')
    return proj_roots[0]


def classify(t: str):
    rules = [
        ('總表-子表同步', ['runsync', 'sync_run_log', 'sync_detail_log', 'sync_review_queue', 'backup_sync']),
        ('匯入主流程/案件異動', ['執行匯入程序', '建立新個案', '執行資料更新', '寫入案件歷程', '家戶勾稽']),
        ('表單重置/下拉選單', ['重置', 'dropdown', 'validation', 'setlongdropdown', 'setsimpledropdown', '資料清除']),
        ('原始文字解析', ['分析開始', 'getmatch', 'scankeywords', '智慧標準化日期', 'rawdata']),
        ('派案/分級', ['派案', 'a級', '分級', '督導', '轉銜']),
        ('核對/儀表板/報表', ['儀錶板', '核對', '統計', '報表']),
    ]
    low = t.lower()
    best = ('其他', 0)
    for name, kws in rules:
        s = sum(1 for k in kws if k.lower() in low)
        if s > best[1]:
            best = (name, s)
    return best[0]


def summary(t: str, c: str):
    low = t.lower()
    if 'runsync' in low or 'sync_run_log' in low:
        return '批次匯入、比對、備份、待複核、明細記錄'
    if '執行匯入程序' in t or '建立新個案' in t:
        return '新案/併案/更新三分流，含歷程與家戶勾稽'
    if 'setsimpledropdown' in low or 'setlongdropdown' in low:
        return '重置案件處理表並部署下拉選單'
    if '分析開始' in t or 'getmatch' in low:
        return '從原始文字抽取姓名、身分證、地址、日期'
    if c == '派案/分級':
        return '派案分配、分級調整或督導流程'
    if c == '核對/儀表板/報表':
        return '核對表、儀表板或統計輸出'
    return '通用業務流程或輔助函式'


def hints(t: str):
    s = set()
    s |= set(re.findall(r'\b20\d{2}[/-]\d{1,2}[/-]\d{1,2}\b', t))
    s |= set(re.findall(r'\bV\d+(?:\.\d+)?\b', t, flags=re.I))
    s |= set(re.findall(r'\b115\d{4}\b', t))
    return '、'.join(sorted(s)[:6]) or '-'


def main():
    args = parse_args()
    root = find_inventory_root(args.inventory_root)
    project_root = find_project_root(args.project_root, root)

    inv = list(csv.DictReader((root / '_module_inventory.csv').open(encoding='utf-8-sig')))
    sim = list(csv.DictReader((root / '_module_similarity.csv').open(encoding='utf-8-sig')))
    texts = {r['module']: (root / r['module']).read_text(encoding='utf-8-sig', errors='ignore') for r in inv}

    for r in inv:
        txt = texts[r['module']]
        r['功能群'] = classify(txt)
        r['摘要'] = summary(txt, r['功能群'])
        r['時間線索'] = hints(txt)

    sim_map = {r['module']: [] for r in inv}
    for s in sim:
        a, b = s['module_a'], s['module_b']
        j = float(s['jaccard'])
        sim_map[a].append((b, j))
        sim_map[b].append((a, j))

    for r in inv:
        arr = sorted([x for x in sim_map.get(r['module'], []) if x[1] >= 0.6], key=lambda x: x[1], reverse=True)
        r['相似模組'] = ' / '.join([f"{n}({v:.2f})" for n, v in arr[:3]]) if arr else '-'

    order = ['總表-子表同步', '匯入主流程/案件異動', '表單重置/下拉選單', '原始文字解析', '派案/分級', '核對/儀表板/報表', '其他']
    inv = sorted(inv, key=lambda r: (order.index(r['功能群']) if r['功能群'] in order else 99, r['module']))

    lines = []
    lines.append('# VBA 功能文字彙整（表格版）')
    lines.append('')
    lines.append(f'解析範圍：標準模組 {len(inv)} 個。')
    lines.append('')
    lines.append('| 模組 | 行數 | 程序數 | 功能群 | 功能摘要 | 製作時間線索(程式內) | 相似模組 |')
    lines.append('|---|---:|---:|---|---|---|---|')
    for r in inv:
        lines.append(f"| {r['module']} | {r['lines']} | {r['proc_count']} | {r['功能群']} | {r['摘要']} | {r['時間線索']} | {r['相似模組']} |")

    lines.append('')
    lines.append('## 相似功能差異（重點）')
    for s in sorted(sim, key=lambda x: float(x['jaccard']), reverse=True):
        j = float(s['jaccard'])
        if j < 0.70:
            continue
        a, b = s['module_a'], s['module_b']
        la = int(next(x['lines'] for x in inv if x['module'] == a))
        lb = int(next(x['lines'] for x in inv if x['module'] == b))
        if la == lb:
            diff = '幾乎同版（可能是備份/複製）'
        elif abs(la - lb) > 80:
            diff = '同核心但其中一版有較大增修'
        else:
            diff = '同功能近似版，局部差異'
        lines.append(f'- {a} vs {b}（相似度 {j:.2f}）：{diff}')

    out = project_root / '04_開發與業務文件' / 'VBA功能文字彙整_表格版.md'
    out.write_text('\n'.join(lines), encoding='utf-8')
    print(out)


if __name__ == '__main__':
    main()
