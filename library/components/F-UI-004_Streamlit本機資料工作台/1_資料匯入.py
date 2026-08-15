import sys
import os
import shutil
import pandas as pd
import streamlit as st

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from scripts.import_files import import_file, get_imported_files
from scripts.anonymize_private_data import detect_pii_in_dataframe

st.set_page_config(page_title="資料匯入 - 本地隱私資料查核工作台", page_icon="📁", layout="wide")

st.markdown("""
<style>
    .import-container {
        border: 2px dashed #475569;
        border-radius: 8px;
        padding: 40px;
        text-align: center;
        background-color: #1e293b;
        margin-bottom: 24px;
    }
</style>
""", unsafe_allow_html=True)

st.title("📁 本地資料匯入與索引建立")
st.write("支援上傳 `.xlsx`, `.xls`, `.csv`, `.docx`, `.txt`, `.md` 等格式。所有檔案僅會保存在您這台電腦的本地資料庫中。")

# 模擬檔案上傳
uploaded_file = st.file_uploader("拖放或點擊選擇檔案上傳", type=["xlsx", "xls", "csv", "docx", "txt", "md"])

if uploaded_file is not None:
    # 建立暫存路徑以供讀取
    temp_dir = os.path.join(PROJECT_ROOT, "01_待查找資料")
    os.makedirs(temp_dir, exist_ok=True)
    temp_file_path = os.path.join(temp_dir, uploaded_file.name)
    
    with open(temp_file_path, "wb") as f:
        f.write(uploaded_file.getbuffer())
        
    st.success(f"檔案已暫存至本地：`01_待查找資料/{uploaded_file.name}`")
    
    # 預覽與個資偵測
    st.markdown("### 🔍 個資風險快速評估預覽 (採樣 50 筆)")
    
    try:
        # 依類型讀取以供預覽
        ext = os.path.splitext(uploaded_file.name)[1].lower()
        df_preview = None
        
        if ext in ['.xlsx', '.xls']:
            df_preview = pd.read_excel(temp_file_path, nrows=50)
        elif ext == '.csv':
            try:
                df_preview = pd.read_csv(temp_file_path, nrows=50, encoding='utf-8')
            except Exception:
                df_preview = pd.read_csv(temp_file_path, nrows=50, encoding='big5')
                
        if df_preview is not None:
            st.dataframe(df_preview.head(10))
            
            # 個資評估
            pii_report = detect_pii_in_dataframe(df_preview)
            
            col1, col2 = st.columns(2)
            with col1:
                st.markdown("#### 🛡️ 個資辨識發現")
                if pii_report.pii_columns:
                    st.warning(f"⚠️ 偵測到可能包含個資的欄位：\n`{', '.join(pii_report.pii_columns)}`")
                    st.info(f"偵測到的個資類型包括：\n`{', '.join(pii_report.pii_types_found)}`")
                else:
                    st.success("🟢 採樣中未發現明顯個資欄位")
            with col2:
                st.markdown("#### 📋 採樣命中範例 (遮蔽顯示)")
                if pii_report.sample_matches:
                    st.write(pd.DataFrame(pii_report.sample_matches).head(5))
                else:
                    st.write("無匹配項")
        else:
            st.info("此檔案類型不支援表格化個資評估，將直接匯入。")
            
    except Exception as e:
        st.error(f"個資風險評估出錯：{e}")
        
    # 確認匯入按鈕
    if st.button("📥 寫入 DuckDB 索引資料庫", type="primary"):
        with st.spinner("資料索引建立中..."):
            success, msg = import_file(temp_file_path)
            if success:
                st.success("🎉 資料已成功寫入 DuckDB 資料庫！您現在可以使用關鍵字查找或核對功能了。")
            else:
                st.error(f"資料寫入失敗：{msg}")

st.markdown("---")
st.markdown("### 🗃️ 目前已匯入的檔案清單")
files = get_imported_files()
if files:
    df_files = pd.DataFrame(files)
    # 重命名欄位符合中文閱讀
    df_files_show = df_files[[
        "file_name", "file_type", "sheet_name", "row_count", "has_pii", "pii_types", "imported_at"
    ]].rename(columns={
        "file_name": "檔案名稱",
        "file_type": "類型",
        "sheet_name": "工作表/分區",
        "row_count": "總筆數",
        "has_pii": "是否含個資",
        "pii_types": "個資類型",
        "imported_at": "匯入時間"
    })
    st.dataframe(df_files_show, use_container_width=True)
else:
    st.info("目前資料庫中尚無已匯入的檔案，請在上方上傳以建立索引。")
