import sys
import os
import pandas as pd
import streamlit as st

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from scripts.anonymize_private_data import anonymize_dataframe, detect_pii_in_dataframe
from scripts.import_files import get_imported_files

st.set_page_config(page_title="個資隱匿 - 本地隱私資料查核工作台", page_icon="🛡️", layout="wide")

st.title("🛡️ 本地個資去識別化與隱匿")
st.write("將含個資的資料表進行遮蔽、替換或刪除。本系統支援「一致性假資料對照」，確保同一真實值永遠替換為同一個假值。")

imported_files = get_imported_files()
tables = [f["table_name"] for f in imported_files]
file_map = {f["table_name"]: f"{f['file_name']} -> {f['sheet_name']}" for f in imported_files}

if len(imported_files) < 1:
    st.info("💡 請先前往 [1_資料匯入] 頁面匯入至少一份資料以進行個資隱匿。")
else:
    selected_table = st.selectbox("選擇要處理的資料表", tables, format_func=lambda x: file_map.get(x, x))
    
    # 讀取部分資料預覽
    db_path = os.path.join(PROJECT_ROOT, "database", "local_index.duckdb")
    import duckdb
    conn = duckdb.connect(db_path)
    df = conn.execute(f"SELECT * FROM {selected_table}").df()
    conn.close()
    
    st.markdown("### 📋 原始資料大綱")
    st.dataframe(df.head(5))
    
    # 執行個資掃描
    pii_report = detect_pii_in_dataframe(df)
    
    with st.form("anonymize_form"):
        col1, col2 = st.columns(2)
        with col1:
            mode = st.selectbox("去識別化模式", ["mask", "fake", "remove"], format_func=lambda x: "模式 A：遮蔽模式 (如：王○明)" if x == "mask" else ("模式 B：假資料替換 (如：固定對照為 王小花)" if x == "fake" else "模式 C：完全移除指定欄位"))
            target_cols = st.multiselect("指定處理欄位 (預設為系統探測出的個資欄位)", list(df.columns), default=pii_report.pii_columns)
        with col2:
            st.info("💡 <b>提示</b>：<br>1. <b>假資料對照表</b> mapping_private_to_fake.sqlite 只會保留在您本地的 database/ 資料夾中，絕對不可外流。<br>2. <b>完全移除模式</b>會直接把該欄位從表格中刪除。", unsafe_allow_html=True)
            
        submitted = st.form_submit_button("🛡️ 預覽去識別化結果", type="primary")

    if submitted:
        if not target_cols:
            st.error("請至少選擇一個處理欄位！")
        else:
            # 執行去識別化
            df_anon, report = anonymize_dataframe(df, mode=mode, columns=target_cols)
            
            st.success(f"處理預覽完成！共替換/處理了 {report.replacements_count} 筆次個資項目。")
            
            # 對比展示
            st.markdown("### 👁️ 去識別化後資料預覽")
            st.dataframe(df_anon.head(10))
            
            # 提供下載
            output_dir = os.path.join(PROJECT_ROOT, "03_已去識別化")
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, f"anonymized_{selected_table}.xlsx")
            df_anon.to_excel(output_path, index=False)
            
            with open(output_path, "rb") as f:
                st.download_button(
                    label="📥 下載去識別化後 Excel 檔案",
                    data=f,
                    file_name=f"已去識別化_{file_map.get(selected_table, 'export')}.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )
                
            # 提供保存至資料庫選項 (以利後續在此基礎上進行比對或導出)
            if st.button("💾 將去識別化後的資料覆蓋回本機資料庫"):
                conn = duckdb.connect(db_path)
                conn.register('temp_df', df_anon.astype(str))
                conn.execute(f"DROP TABLE IF EXISTS {selected_table}")
                conn.execute(f"CREATE TABLE {selected_table} AS SELECT * FROM temp_df")
                conn.unregister('temp_df')
                
                # 更新 file_summaries
                conn.execute(
                    "UPDATE file_summaries SET is_anonymized = true, has_pii = false WHERE table_name = ?",
                    (selected_table,)
                )
                conn.close()
                st.success("資料庫已成功更新！")
