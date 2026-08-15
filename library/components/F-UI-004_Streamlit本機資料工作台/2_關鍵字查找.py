import sys
import os
import pandas as pd
import streamlit as st

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from scripts.search_keyword import search, SearchQuery, SearchMode, export_results
from scripts.import_files import get_imported_files

st.set_page_config(page_title="關鍵字查找 - 本地隱私資料查核工作台", page_icon="🔍", layout="wide")

st.title("🔍 本地資料關鍵字查找")
st.write("完全在您本機的 DuckDB 與 SQLite 中執行，支援 16 種搜尋核對模式與模糊比對。")

# 獲取可選檔案列表
imported_files = get_imported_files()
file_names = list(set([f["file_name"] for f in imported_files]))

# 搜尋設定表單
with st.form("search_form"):
    col1, col2 = st.columns(2)
    with col1:
        keywords_input = st.text_input("輸入關鍵字 (多個關鍵字請以英文逗號分隔)", placeholder="例如：雙老家庭, 苗栗市")
        mode = st.selectbox("搜尋模式", [m.value for m in SearchMode], index=1)
        exclude_input = st.text_input("排除關鍵字 (多個以逗號分隔)", placeholder="選填")
    with col2:
        target_files = st.multiselect("限制搜尋檔案", ["全部"] + file_names, default=["全部"])
        fuzzy_threshold = st.slider("模糊相似度閾值", 50, 100, 70, help="僅適用於模糊與地址片段搜尋")
        
        # 進階日期/地區篩選
        date_start = st.text_input("日期區間：開始 (YYYY-MM-DD)", placeholder="選填")
        date_end = st.text_input("日期區間：結束 (YYYY-MM-DD)", placeholder="選填")
        
    submitted = st.form_submit_button("🔍 開始搜尋", type="primary")

if submitted:
    if not keywords_input and mode != "pii_column":
        st.error("請輸入關鍵字！")
    else:
        # 解析關鍵字與排除詞
        keywords = [k.strip() for k in keywords_input.split(",") if k.strip()] if keywords_input else []
        exclude_keywords = [e.strip() for e in exclude_input.split(",") if e.strip()] if exclude_input else None
        
        # 建立 Query
        query = SearchQuery(
            keywords=keywords,
            mode=SearchMode(mode),
            target_files=target_files if "全部" not in target_files else None,
            exclude_keywords=exclude_keywords,
            fuzzy_threshold=fuzzy_threshold,
            date_start=date_start if date_start else None,
            date_end=date_end if date_end else None
        )
        
        # 執行搜尋
        with st.spinner("本機搜尋中..."):
            results = search(query, use_cache=False)
            
        st.success(f"搜尋完成！共命中 {results.total_hits} 筆記錄，費時 {results.search_time_seconds:.4f} 秒。")
        
        if results.hits:
            # 轉換為 DataFrame 顯示
            data = []
            for h in results.hits:
                data.append({
                    "來源檔案": h.source_file,
                    "工作表": h.sheet_name,
                    "行號": h.row_number,
                    "欄位": h.column_name,
                    "命中內容": h.matched_content,
                    "前後文摘要": h.context,
                    "相似得分": f"{h.similarity_score:.1f}",
                    "含個資": "⚠️ 是" if h.contains_pii else "否",
                    "需人確": "🔎 建議" if h.suggest_human_review else "否"
                })
            df_hits = pd.DataFrame(data)
            st.dataframe(df_hits, use_container_width=True)
            
            # 提供匯出
            output_dir = os.path.join(PROJECT_ROOT, "02_比對結果")
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, "search_results_export.xlsx")
            export_results(results, output_path)
            
            # 下載按鈕
            with open(output_path, "rb") as f:
                st.download_button(
                    label="📥 下載搜尋結果 Excel 報表",
                    data=f,
                    file_name="搜尋結果報表.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )
        else:
            st.info("未找到符合的記錄。")
