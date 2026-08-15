import sys
import os
import pandas as pd
import streamlit as st

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from scripts.compare_excel import compare, CompareRequest, CompareMode, MatchLevel, export_compare_results
from scripts.import_files import get_imported_files

st.set_page_config(page_title="資料核對 - 本地隱私資料查核工作台", page_icon="⚖️", layout="wide")

st.title("⚖️ 本地資料核對與比對")
st.write("執行檔案之間的比對、重複個案查找、交集與差集計算。所有比對皆由本機確定性程式執行。")

# 獲取已匯入的檔案列表
imported_files = get_imported_files()
tables = [f["table_name"] for f in imported_files]
file_map = {f["table_name"]: f"{f['file_name']} -> {f['sheet_name']}" for f in imported_files}

if len(imported_files) < 1:
    st.info("💡 請先前往 [1_資料匯入] 頁面匯入至少一份資料以進行核對。")
else:
    with st.form("compare_form"):
        col1, col2 = st.columns(2)
        with col1:
            file_a = st.selectbox("選擇主資料表 (A 表)", tables, format_func=lambda x: file_map.get(x, x))
            mode = st.selectbox("核對模式", [m.value for m in CompareMode])
            
            # 手動欄位指定 (選填)
            st.markdown("#### 🔧 欄位指定 (選填，留空由系統自動識別)")
            name_col = st.text_input("姓名欄位名稱", placeholder="如：案主姓名, 姓名")
            phone_col = st.text_input("電話欄位名稱", placeholder="如：聯絡電話, 手機")
            
        with col2:
            file_b = st.selectbox("選擇比對資料表 (B 表，部分模式免填)", ["無"] + tables, format_func=lambda x: file_map.get(x, x) if x != "無" else "無")
            search_value = st.text_input("特定查詢值 (如核對單一地址是否存在)", placeholder="選填")
            
            # 更多欄位指定
            st.markdown("#### 🔧 欄位指定")
            id_col = st.text_input("身分證欄位名稱", placeholder="如：身分證字號")
            addr_col = st.text_input("地址欄位名稱", placeholder="如：戶籍地址, 住址")
            fuzzy_threshold = st.slider("模糊匹配閾值 (地址/姓名)", 50, 100, 70)
            
        submitted = st.form_submit_button("⚖️ 執行核對", type="primary")

    if submitted:
        # 建立請求
        req = CompareRequest(
            mode=CompareMode(mode),
            file_a=file_a,
            file_b=file_b if file_b != "無" else None,
            search_value=search_value if search_value else None,
            name_column=name_col if name_col else None,
            phone_column=phone_col if phone_col else None,
            id_column=id_col if id_col else None,
            address_column=addr_col if addr_col else None,
            fuzzy_threshold=fuzzy_threshold
        )
        
        with st.spinner("比對運算中..."):
            try:
                results = compare(req)
                st.success(f"核對完成！共比對 {results.total_compared} 筆，發現 {len(results.matches)} 筆符合/重複/疑似項目。")
                
                # 統計面板
                if results.summary:
                    st.markdown("### 📊 比對結果分佈統計")
                    st.write(results.summary)
                    
                if results.matches:
                    st.markdown("### 📋 詳細比對結果")
                    data = []
                    for m in results.matches:
                        data.append({
                            "符合等級": m.match_level.value,
                            "A表位置": m.source_a,
                            "B表位置/查詢值": m.source_b,
                            "符合細節": m.details,
                            "相似得分": str(m.similarity_scores),
                            "人工確認": "🔎 建議" if m.suggest_human_review else "否"
                        })
                    df_matches = pd.DataFrame(data)
                    st.dataframe(df_matches, use_container_width=True)
                    
                    # 匯出檔案
                    output_dir = os.path.join(PROJECT_ROOT, "02_比對結果")
                    os.makedirs(output_dir, exist_ok=True)
                    output_path = os.path.join(output_dir, "compare_results_export.xlsx")
                    export_compare_results(results, output_path)
                    
                    with open(output_path, "rb") as f:
                        st.download_button(
                            label="📥 下載比對結果 Excel 報表",
                            data=f,
                            file_name="資料核對報告.xlsx",
                            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        )
                else:
                    st.info("未發現符合或重複的資料。")
            except Exception as e:
                st.error(f"核對失敗：{e}")
