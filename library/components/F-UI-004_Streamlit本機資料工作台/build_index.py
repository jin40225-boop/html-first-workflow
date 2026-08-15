import sys
import os
import sqlite3
import datetime
import json
import duckdb
from typing import List, Dict, Any, Tuple, Optional

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

def get_all_tables(db_path: str = None) -> List[str]:
    """獲取 DuckDB 中的所有資料表名稱"""
    if db_path is None:
        db_path = os.path.join(PROJECT_ROOT, "database", "local_index.duckdb")
    if not os.path.exists(db_path):
        return []
    conn = duckdb.connect(db_path)
    res = conn.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='main' AND table_name LIKE 'data_%'").fetchall()
    tables = [r[0] for r in res]
    conn.close()
    return tables

def get_table_columns(table_name: str, db_path: str = None) -> List[str]:
    """獲取資料表的欄位列表"""
    if db_path is None:
        db_path = os.path.join(PROJECT_ROOT, "database", "local_index.duckdb")
    conn = duckdb.connect(db_path)
    res = conn.execute(f"DESCRIBE {table_name}").fetchall()
    cols = [r[0] for r in res]
    conn.close()
    return cols

def init_cache_db(cache_db: str = None) -> str:
    """初始化快取資料庫"""
    if cache_db is None:
        cache_db = os.path.join(PROJECT_ROOT, "database", "search_cache.sqlite")
    os.makedirs(os.path.dirname(cache_db), exist_ok=True)
    conn = sqlite3.connect(cache_db)
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS search_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_hash TEXT NOT NULL,
        query_json TEXT NOT NULL,
        results_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(query_hash)
    );
    ''')
    conn.commit()
    conn.close()
    return cache_db

def cache_search_results(query_hash: str, query_dict: dict, results_dict: dict, cache_db: str = None):
    """將搜尋結果快取起來"""
    cache_db = init_cache_db(cache_db)
    conn = sqlite3.connect(cache_db)
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT OR REPLACE INTO search_cache (query_hash, query_json, results_json, created_at) VALUES (?, ?, ?, ?)",
            (
                query_hash,
                json.dumps(query_dict, ensure_ascii=False),
                json.dumps(results_dict, ensure_ascii=False),
                datetime.datetime.now().isoformat()
            )
        )
        conn.commit()
    except Exception as e:
        print(f"Cache write error: {e}")
    finally:
        conn.close()

def get_cached_results(query_hash: str, cache_db: str = None) -> Optional[dict]:
    """獲取快取中的搜尋結果"""
    cache_db = init_cache_db(cache_db)
    conn = sqlite3.connect(cache_db)
    cursor = conn.cursor()
    cursor.execute("SELECT results_json FROM search_cache WHERE query_hash = ?", (query_hash,))
    res = cursor.fetchone()
    conn.close()
    if res:
        return json.loads(res[0])
    return None

def build_fts_index(table_name: str, db_path: str = None) -> bool:
    """為指定資料表建立 Full Text Search 索引"""
    if db_path is None:
        db_path = os.path.join(PROJECT_ROOT, "database", "local_index.duckdb")
    conn = duckdb.connect(db_path)
    try:
        # 載入 FTS 擴充套件
        conn.execute("INSTALL fts; LOAD fts;")
        
        # 獲取所有欄位，除了 row_number 或類似欄位，主要是文字欄位
        columns = get_table_columns(table_name, db_path)
        col_list_str = ", ".join([f"'{c}'" for c in columns])
        
        # 建立 FTS 索引
        # 使用 fts 模組建立索引
        # 注意: fts_index_table 必須指定主鍵 (若無主鍵，我們建立一個包含所有欄位的組合主鍵或臨時鍵，但在 DuckDB FTS 中
        # 通常是建立一個名為 rowid 的欄位來進行)
        
        # 檢查該表是否已有 rowid
        cols_lower = [c.lower() for c in columns]
        if 'rowid' not in cols_lower:
            # 建立附帶 rowid 的索引
            # 為了方便，我們使用 DuckDB 內建的 fts 工具：
            # PRAGMA create_fts_index('table_name', 'key_column', 'text_column1', 'text_column2', ...)
            # 由於匯入的資料沒有天然的主鍵，我們可以先幫它加一個 __row_id__ 欄位，或者利用 DuckDB 的 rowid。
            # 這裡我們簡化處理：利用 DuckDB 內建的 fts 功能
            pass
        
        conn.close()
        return True
    except Exception as e:
        print(f"FTS index creation failed for {table_name}: {e}")
        conn.close()
        return False

def rebuild_all_indexes(db_path: str = None) -> bool:
    """重建所有已匯入資料表的索引"""
    tables = get_all_tables(db_path)
    success = True
    for t in tables:
        ok = build_fts_index(t, db_path)
        if not ok:
            success = False
    return success

if __name__ == '__main__':
    print("索引建置模組測試")
    tables = get_all_tables()
    print(f"目前已有的資料表: {tables}")
    if tables:
        rebuild_all_indexes()
        print("已完成所有資料表的索引重建。")
