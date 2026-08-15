"""
全資料夾個資清除腳本 v2.0
用途：清除 Excel VBA與管理系統專案資料夾 內所有個資
      （xlsm / xlsx / xls / csv / docx / db / pdf / 文字檔）

執行：python 全資料夾個資清除.py
不備份，直接覆寫（使用者已確認）

處理規則：
  姓名欄   → 測試案主001 ... （跨檔一致）
  身分證   → K000000001 ...
  地址欄   → 示範縣示範市示範里X鄰測試路X號
  電話欄   → 0912-001-000 ...
  聯絡人欄 → 測試聯絡人001 ...

不替換：社工姓名（非個資）、案號、日期、統計數值
"""
from __future__ import annotations
import re
import sys
import sqlite3
from pathlib import Path

import openpyxl
import xlrd

# ── 跳過資料夾 ────────────────────────────────────────────────────────────────
SKIP_DIRS = {".venv", "report-builder", "__pycache__"}

# ── 個資欄位分類 ──────────────────────────────────────────────────────────────
NAME_COLS    = {"個案姓名", "身心障礙者姓名", "姓名", "服務使用者姓名",
                "個案名稱", "案主姓名", "姓名（個案）"}
ID_COLS      = {"身分證字號", "身份證字號", "身分證號", "身份證號"}
ADDR_COLS    = {"戶籍地址", "通訊地址", "通訊住址", "居住地址", "地址"}
PHONE_COLS   = {"聯絡電話", "電話", "手機", "行動電話", "家用電話",
                "mobile_phone", "home_phone"}
CONTACT_COLS = {"聯絡人", "緊急聯絡人", "照顧者姓名", "家屬姓名",
                "主要照顧者", "照顧者"}
ALL_PII_COLS = NAME_COLS | ID_COLS | ADDR_COLS | PHONE_COLS | CONTACT_COLS

# ── 全域對照表（跨所有檔案一致）─────────────────────────────────────────────
_name_map:    dict[str, str] = {}
_id_map:      dict[str, str] = {}
_addr_map:    dict[str, str] = {}
_phone_map:   dict[str, str] = {}
_contact_map: dict[str, str] = {}

# ── 正規表達式（用於 docx / 文字檔）─────────────────────────────────────────
RE_ID    = re.compile(r'\b[A-Z][12]\d{8}\b')
RE_PHONE = re.compile(r'0[89]\d{1,2}[-\s]?\d{3}[-\s]?\d{3,4}')
RE_ADDR  = re.compile(
    r'[一-鿿]{2,4}[縣市][一-鿿]{2,4}[鄉鎮市區]'
    r'[一-鿿]{2,10}[路街巷弄號\d]+[號]?'
)


# ── 假值產生器 ────────────────────────────────────────────────────────────────
def _fake(val: str, col_type: str) -> str:
    v = str(val).strip()
    if not v or v in ("nan", "0", "False", "None", ""):
        return val

    if col_type == "NAME":
        if v not in _name_map:
            _name_map[v] = f"測試案主{len(_name_map)+1:03d}"
        return _name_map[v]

    if col_type == "ID":
        key = v.upper()
        if key not in _id_map:
            _id_map[key] = f"K{len(_id_map)+1:09d}"
        return _id_map[key]

    if col_type == "ADDR":
        if v not in _addr_map:
            n = len(_addr_map) + 1
            _addr_map[v] = f"示範縣示範市示範里{n}鄰測試路{n}號"
        return _addr_map[v]

    if col_type == "PHONE":
        if v not in _phone_map:
            _phone_map[v] = f"0912-{len(_phone_map)+1:03d}-000"
        return _phone_map[v]

    if col_type == "CONTACT":
        if v not in _contact_map:
            _contact_map[v] = f"測試聯絡人{len(_contact_map)+1:03d}"
        return _contact_map[v]

    return val


def _col_type(header: str) -> str | None:
    h = header.strip()
    if h in NAME_COLS:    return "NAME"
    if h in ID_COLS:      return "ID"
    if h in ADDR_COLS:    return "ADDR"
    if h in PHONE_COLS:   return "PHONE"
    if h in CONTACT_COLS: return "CONTACT"
    return None


def _find_header_row(ws) -> int | None:
    for row_idx, row in enumerate(
        ws.iter_rows(min_row=1, max_row=20, values_only=True), start=1
    ):
        headers = [str(c).strip() if c is not None else "" for c in row]
        if any(h in ALL_PII_COLS for h in headers):
            return row_idx
    return None


# ── XLSX / XLSM 處理 ──────────────────────────────────────────────────────────
def process_excel(path: Path, keep_vba: bool = False) -> tuple[int, int]:
    """就地匿名化一個 xlsx/xlsm。回傳 (sheets_touched, cells_replaced)。"""
    try:
        wb = openpyxl.load_workbook(path, keep_vba=keep_vba, data_only=False)
    except Exception as e:
        return -1, 0

    total_sheets = 0
    total_cells  = 0

    for ws in wb.worksheets:
        hdr_row = _find_header_row(ws)
        if hdr_row is None:
            continue

        max_col = ws.max_column or 1
        col_types: dict[int, str] = {}
        for col_idx in range(1, max_col + 1):
            cell_val = ws.cell(row=hdr_row, column=col_idx).value
            if cell_val is None:
                continue
            ct = _col_type(str(cell_val))
            if ct:
                col_types[col_idx] = ct

        if not col_types:
            continue

        sheet_count = 0
        max_row = ws.max_row or 1
        for row_idx in range(hdr_row + 1, max_row + 1):
            for col_idx, ct in col_types.items():
                cell = ws.cell(row=row_idx, column=col_idx)
                if cell.value is None:
                    continue
                orig = str(cell.value).strip()
                if not orig or orig in ("nan", "0"):
                    continue
                faked = _fake(orig, ct)
                if faked != orig:
                    cell.value = faked
                    sheet_count += 1

        if sheet_count > 0:
            total_sheets += 1
            total_cells  += sheet_count

    if total_cells > 0:
        wb.save(path)
    wb.close()
    return total_sheets, total_cells


# ── XLS 處理（讀取後另存為同名 xlsx）────────────────────────────────────────
def process_xls(path: Path) -> tuple[int, int]:
    """讀取 xls，匿名化後存成新 xlsx（以 _clean.xlsx 後綴）。"""
    try:
        wb_src = xlrd.open_workbook(path, formatting_info=False)
    except Exception as e:
        return -1, 0

    wb_dst = openpyxl.Workbook()
    wb_dst.remove(wb_dst.active)   # 移除預設空工作表

    total_sheets = 0
    total_cells  = 0

    for sh in wb_src.sheets():
        ws_dst = wb_dst.create_sheet(title=sh.name)
        if sh.nrows < 2:
            continue

        # 尋找標題列（前20列）
        hdr_row_idx = None
        col_types: dict[int, str] = {}
        for r in range(min(20, sh.nrows)):
            row_vals = [str(sh.cell(r, c).value).strip() for c in range(sh.ncols)]
            if any(v in ALL_PII_COLS for v in row_vals):
                hdr_row_idx = r
                for c, v in enumerate(row_vals):
                    ct = _col_type(v)
                    if ct:
                        col_types[c] = ct
                break

        sheet_count = 0
        for r in range(sh.nrows):
            row_out = []
            for c in range(sh.ncols):
                cell_val = sh.cell(r, c).value
                if hdr_row_idx is not None and r > hdr_row_idx and c in col_types:
                    orig = str(cell_val).strip()
                    if orig and orig not in ("nan", "0"):
                        faked = _fake(orig, col_types[c])
                        if faked != orig:
                            cell_val = faked
                            sheet_count += 1
                row_out.append(cell_val)
            ws_dst.append(row_out)

        if sheet_count > 0:
            total_sheets += 1
            total_cells  += sheet_count

    # 存成 xlsx（同名但副檔名改為 .xlsx）
    out_path = path.with_suffix(".xlsx")
    wb_dst.save(out_path)
    wb_dst.close()
    wb_src.release_resources()

    # 刪除原始 xls
    try:
        path.unlink()
    except Exception:
        pass

    return total_sheets, total_cells


# ── CSV 處理 ──────────────────────────────────────────────────────────────────
def process_csv(path: Path) -> int:
    """就地匿名化 CSV。回傳替換格數。"""
    import csv, io
    try:
        raw = path.read_bytes()
        # 嘗試偵測編碼
        for enc in ("utf-8-sig", "cp950", "utf-8", "gbk"):
            try:
                text = raw.decode(enc)
                break
            except Exception:
                continue
        else:
            return 0

        lines = text.splitlines(keepends=True)
        if not lines:
            return 0

        # 讀取全部列
        reader = csv.reader(io.StringIO(text))
        rows = list(reader)
        if not rows:
            return 0

        # 找標題列
        hdr_row_idx = None
        col_types: dict[int, str] = {}
        for i, row in enumerate(rows[:20]):
            for j, h in enumerate(row):
                ct = _col_type(h.strip())
                if ct:
                    col_types[j] = ct
            if col_types:
                hdr_row_idx = i
                break

        if hdr_row_idx is None:
            return 0

        count = 0
        for i in range(hdr_row_idx + 1, len(rows)):
            for j, ct in col_types.items():
                if j >= len(rows[i]):
                    continue
                orig = rows[i][j].strip()
                if not orig or orig in ("nan", "0"):
                    continue
                faked = _fake(orig, ct)
                if faked != orig:
                    rows[i][j] = faked
                    count += 1

        if count > 0:
            out = io.StringIO()
            writer = csv.writer(out)
            writer.writerows(rows)
            path.write_bytes(out.getvalue().encode("utf-8-sig"))

        return count

    except Exception as e:
        return 0


# ── DOCX 處理 ─────────────────────────────────────────────────────────────────
def _replace_in_text(text: str) -> tuple[str, int]:
    """用正規表達式替換文字中的身分證/電話/地址，回傳 (新文字, 替換數)。"""
    count = 0

    def sub_id(m):
        nonlocal count
        orig = m.group(0)
        r = _fake(orig, "ID")
        if r != orig:
            count += 1
        return r

    def sub_phone(m):
        nonlocal count
        orig = m.group(0)
        r = _fake(orig, "PHONE")
        if r != orig:
            count += 1
        return r

    text = RE_ID.sub(sub_id, text)
    text = RE_PHONE.sub(sub_phone, text)
    return text, count


def process_docx(path: Path) -> int:
    """替換 docx 中的 ID/電話 pattern。回傳替換數。"""
    try:
        import docx as python_docx
        doc = python_docx.Document(path)
    except Exception:
        return 0

    count = 0

    # 段落
    for para in doc.paragraphs:
        for run in para.runs:
            new_text, n = _replace_in_text(run.text)
            if n:
                run.text = new_text
                count += n

    # 表格
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    for run in para.runs:
                        new_text, n = _replace_in_text(run.text)
                        if n:
                            run.text = new_text
                            count += n

    if count > 0:
        doc.save(path)
    return count


# ── SQLite DB 處理（活動報名管理系統）────────────────────────────────────────────
def _get_db_columns(conn: sqlite3.Connection, table: str) -> list[str]:
    cursor = conn.execute(f"PRAGMA table_info([{table}])")
    return [row[1] for row in cursor.fetchall()]


def process_db(path: Path) -> int:
    """清除 SQLite db 中的個資欄位，回傳更新列數。"""
    try:
        conn = sqlite3.connect(path)
    except Exception:
        return 0

    # 個資欄位對照（欄位名稱 → 類型）
    PII_FIELDS = {
        "name": "NAME", "full_name": "NAME", "participant_name": "NAME",
        "representative_name": "NAME", "primary_contact_name": "NAME",
        "emergency_contact_name": "CONTACT", "caregiver_name": "CONTACT",
        "driver_name": "CONTACT",
        "id_number": "ID", "caregiver_id_number": "ID",
        "mobile_phone": "PHONE", "home_phone": "PHONE", "phone": "PHONE",
        "emergency_contact_phone": "PHONE", "caregiver_phone": "PHONE",
        "primary_contact_phone": "PHONE", "driver_phone": "PHONE",
        "pickup_location": "ADDR", "dropoff_location": "ADDR",
        "vehicle_plate": "ID",   # 車牌視同 ID 型假值
        "license_plate": "ID",
    }

    total_updates = 0
    try:
        tables = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()

        for (tbl,) in tables:
            cols = _get_db_columns(conn, tbl)
            pii_cols = {c: PII_FIELDS[c] for c in cols if c in PII_FIELDS}
            if not pii_cols:
                continue

            rows = conn.execute(
                f"SELECT rowid, {', '.join(pii_cols)} FROM [{tbl}]"
            ).fetchall()

            for row in rows:
                rowid = row[0]
                updates = {}
                for i, (col, ct) in enumerate(pii_cols.items()):
                    orig = row[i + 1]
                    if orig is None:
                        continue
                    faked = _fake(str(orig), ct)
                    if faked != str(orig):
                        updates[col] = faked

                if updates:
                    set_clause = ", ".join(f"[{c}] = ?" for c in updates)
                    conn.execute(
                        f"UPDATE [{tbl}] SET {set_clause} WHERE rowid = ?",
                        list(updates.values()) + [rowid],
                    )
                    total_updates += len(updates)

        conn.commit()
    except Exception as e:
        print(f"    DB 錯誤: {e}")
    finally:
        conn.close()

    return total_updates


# ── 主程式 ────────────────────────────────────────────────────────────────────
def should_skip(path: Path) -> bool:
    for part in path.parts:
        if part in SKIP_DIRS:
            return True
    # 跳過 Office 暫存檔（~$開頭）
    if path.name.startswith("~$"):
        return True
    return False


def main():
    base = Path(__file__).parent
    print(f"目標資料夾：{base}")
    print("=" * 60)

    grand_cells = 0
    errors      = []

    # ── 1. XLSM ──────────────────────────────────────────────────
    print("\n【XLSM 檔案】")
    for f in sorted(base.rglob("*.xlsm")):
        if should_skip(f):
            continue
        rel = f.relative_to(base)
        print(f"  {rel} ...", end=" ", flush=True)
        try:
            sheets, cells = process_excel(f, keep_vba=True)
            if sheets == -1:
                print("✗ 無法開啟（可能被 Excel 鎖定，請關閉後重試）")
                errors.append(str(rel))
            else:
                grand_cells += cells
                print(f"✓ {cells} 格")
        except Exception as e:
            print(f"✗ {e}")
            errors.append(str(rel))

    # ── 2. XLSX ──────────────────────────────────────────────────
    print("\n【XLSX 檔案】")
    for f in sorted(base.rglob("*.xlsx")):
        if should_skip(f):
            continue
        rel = f.relative_to(base)
        print(f"  {rel} ...", end=" ", flush=True)
        try:
            sheets, cells = process_excel(f, keep_vba=False)
            if sheets == -1:
                print("✗ 無法開啟")
                errors.append(str(rel))
            else:
                grand_cells += cells
                print(f"✓ {cells} 格")
        except Exception as e:
            print(f"✗ {e}")
            errors.append(str(rel))

    # ── 3. XLS ───────────────────────────────────────────────────
    print("\n【XLS 檔案（轉存為 xlsx）】")
    for f in sorted(base.rglob("*.xls")):
        if should_skip(f):
            continue
        rel = f.relative_to(base)
        print(f"  {rel} ...", end=" ", flush=True)
        try:
            sheets, cells = process_xls(f)
            if sheets == -1:
                print("✗ 無法開啟")
                errors.append(str(rel))
            else:
                grand_cells += cells
                print(f"✓ {cells} 格（→ .xlsx）")
        except Exception as e:
            print(f"✗ {e}")
            errors.append(str(rel))

    # ── 4. CSV ───────────────────────────────────────────────────
    print("\n【CSV 檔案】")
    for f in sorted(base.rglob("*.csv")):
        if should_skip(f):
            continue
        rel = f.relative_to(base)
        print(f"  {rel} ...", end=" ", flush=True)
        try:
            cells = process_csv(f)
            grand_cells += cells
            print(f"✓ {cells} 格")
        except Exception as e:
            print(f"✗ {e}")
            errors.append(str(rel))

    # ── 5. DOCX ──────────────────────────────────────────────────
    print("\n【DOCX 檔案】")
    for f in sorted(base.rglob("*.docx")):
        if should_skip(f):
            continue
        rel = f.relative_to(base)
        print(f"  {rel} ...", end=" ", flush=True)
        try:
            cells = process_docx(f)
            grand_cells += cells
            print(f"✓ {cells} 格")
        except Exception as e:
            print(f"✗ {e}")
            errors.append(str(rel))

    # ── 6. SQLite DB（活動報名）──────────────────────────────────────
    print("\n【SQLite DB 檔案】")
    for f in sorted(base.rglob("*.db")):
        if should_skip(f):
            continue
        rel = f.relative_to(base)
        print(f"  {rel} ...", end=" ", flush=True)
        try:
            updates = process_db(f)
            grand_cells += updates
            print(f"✓ {updates} 欄位")
        except Exception as e:
            print(f"✗ {e}")
            errors.append(str(rel))

    # ── 7. PDF（含個資者刪除）────────────────────────────────────
    print("\n【PDF 檔案（含個案個資者刪除）】")
    pii_pdfs = [
        "身障轉介表(TF00534872).pdf",
        "開案表(CA00267017).pdf",
    ]
    for f in sorted(base.rglob("*.pdf")):
        if should_skip(f):
            continue
        if f.name in pii_pdfs:
            try:
                f.unlink()
                print(f"  {f.relative_to(base)} → 已刪除")
            except Exception as e:
                print(f"  {f.relative_to(base)} ✗ {e}")
        else:
            print(f"  {f.relative_to(base)} → 保留（統計/說明文件）")

    # ── 統計 ─────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"完成！共處理 {grand_cells} 個欄位/儲存格")
    print(f"  姓名對照：{len(_name_map)} 筆")
    print(f"  身分證對照：{len(_id_map)} 筆")
    print(f"  地址對照：{len(_addr_map)} 筆")
    print(f"  電話對照：{len(_phone_map)} 筆")
    print(f"  聯絡人對照：{len(_contact_map)} 筆")

    if errors:
        print(f"\n⚠  以下 {len(errors)} 個檔案處理失敗（請關閉後重試）：")
        for e in errors:
            print(f"  {e}")


if __name__ == "__main__":
    main()
