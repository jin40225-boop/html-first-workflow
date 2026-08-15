import argparse
import csv
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


def summarize(t, c):
    tl = t.lower()
    if 'runsync' in tl or 'sync_run_log' in tl:
        return '子表到總表批次同步、備份、待複核與明細記錄'
    if '執行匯入程序' in t or '建立新個案' in t:
        return '案件匯入主引擎：新案/併案/更新、家戶勾稽、歷程'
    if '分析開始' in t or 'getmatch' in tl:
        return '原始文字解析與欄位自動填值'
    if 'dropdown' in tl and ('重置' in t or '資料清除' in t):
        return '案件處理表初始化與下拉選單部署'
    if '派案' in t and ('A級' in t or '分級' in t):
        return '派案與分級流程'
    if '儀錶板' in t or '核對' in t:
        return '核對表/儀錶板資料整理'
    if c == '報表/統計':
        return '報表統計與分析輸出'
    return '通用業務流程或輔助函式'


def main():
    args = parse_args()
    root = find_inventory_root(args.inventory_root)
    project_root = find_project_root(args.project_root, root)

    inv = list(csv.DictReader((root / '_module_inventory.csv').open(encoding='utf-8-sig')))
    sim = list(csv.DictReader((root / '_module_similarity.csv').open(encoding='utf-8-sig')))
    texts = {r['module']: (root / r['module']).read_text(encoding='utf-8-sig', errors='ignore') for r in inv}

    sim_map = {r['module']: [] for r in inv}
    for s in sim:
        a, b = s['module_a'], s['module_b']
        j = float(s['jaccard'])
        sim_map[a].append((b, j))
        sim_map[b].append((a, j))
    mod_by_name = {r['module']: r for r in inv}

    lines = ['# VBA 功能總表（完整解析）', '', f'解析範圍：標準模組 {len(inv)} 個。', '', '## 核心模組（先看）']
    for m in ['M_SyncSafe.bas', 'Module71.bas', 'Module72.bas', 'Module81.bas', 'Module82.bas', 'Module27.bas', 'Module2.bas']:
        if m not in mod_by_name:
            continue
        r = mod_by_name[m]
        txt = texts[m]
        sims = sorted(sim_map.get(m, []), key=lambda x: x[1], reverse=True)[:3]
        lines += [
            f'### {m}',
            f'- 功能：{summarize(txt, r["category"])}',
            f'- 推定製作時間線索：{r["time_hints"] or "未抓到明確日期"}',
            f'- 主要程序數：{r["proc_count"]}（行數 {r["lines"]}）',
            '- 相似模組：' + ('；'.join([f'{n}({v:.2f})' for n, v in sims]) if sims else '無'),
            ''
        ]

    lines += ['## 全模組清單', '', '| 模組 | 行數 | 程序數 | 功能分類 | 推定製作時間線索 | 功能摘要 | 相似模組(>0.6) |', '|---|---:|---:|---|---|---|---|']
    for r in sorted(inv, key=lambda x: x['module']):
        m = r['module']
        txt = texts[m]
        sims = sorted([x for x in sim_map.get(m, []) if x[1] >= 0.6], key=lambda x: x[1], reverse=True)
        simtxt = ' / '.join([f"{n}:{v:.2f}" for n, v in sims[:3]]) if sims else '-'
        lines.append(f"| {m} | {r['lines']} | {r['proc_count']} | {r['category']} | {r['time_hints'] or '-'} | {summarize(txt, r['category'])} | {simtxt} |")

    lines += ['', '## 相似功能差異重點', '']
    for s in sorted(sim, key=lambda x: float(x['jaccard']), reverse=True)[:20]:
        j = float(s['jaccard'])
        if j < 0.70:
            continue
        a, b = s['module_a'], s['module_b']
        la, lb = int(mod_by_name[a]['lines']), int(mod_by_name[b]['lines'])
        if la == lb:
            diff = '幾乎同版（可能是備份/複製）'
        elif abs(la - lb) > 80:
            diff = '同核心但其中一版有較大增修'
        else:
            diff = '同功能近似版，僅局部差異'
        lines.append(f'- {a} vs {b}（相似度 {j:.2f}）：{diff}')

    lines += ['', '## 使用建議', '', '- 先清理重複模組：Module81/82、Module32/33、Module4/26。', '- 同步主線固定為 M_SyncSafe，其他同步模組只保留備份。', '- 在更新維護日誌補登「模組名稱 + 日期 + 需求」。']

    out = project_root / '04_開發與業務文件' / 'VBA功能總表_完整解析.md'
    out.write_text('\n'.join(lines), encoding='utf-8')
    print(out)


if __name__ == '__main__':
    main()
