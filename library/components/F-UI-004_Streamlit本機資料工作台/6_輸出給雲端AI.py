import sys
import os
import pandas as pd
import streamlit as st

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from scripts.export_safe_copy import export_safe, verify_no_mapping_leak
from scripts.import_files import get_imported_files

st.set_page_config(page_title="輸出給雲端AI - 本地隱私資料查核工作台", page_icon="☁️", layout="wide")

st.title("☁️ 輸出給雲端 AI 的安全防線")
st.write("在將本地資料上傳至 ChatGPT, Claude 或其它雲端 AI 前，請務必在此執行安全隱匿與稽核管道。")

# 獲取已匯入的待處理資料
temp_dir = os.path.join(PROJECT_ROOT, "01_待查找資料")
os.makedirs(temp_dir, exist_ok=True)
files = [f for f in os.listdir(temp_dir) if f.endswith(('.xlsx', '.xls', '.csv'))]

if not files:
    st.info("💡 目前 `01_待查找資料` 資料夾中無試算表檔案，請先上傳檔案。")
else:
    selected_file = st.selectbox("選擇要安全輸出的檔案", files)
    full_path = os.path.join(temp_dir, selected_file)
    
    col1, col2 = st.columns(2)
    with col1:
        anonymize_mode = st.selectbox("個資去識別化方式", ["fake", "mask"], format_func=lambda x: "模式 B：假資料對照替換 (建議，保留數據關聯)" if x == "fake" else "模式 A：遮蔽模式 (如：王○明)")
    with col2:
        st.warning("⚠️ **安全提示**：對照表 `mapping_private_to_fake.sqlite` 絕對不會被複製至雲端輸出資料夾。")
        
    if st.button("🛡️ 啟動安全核可輸出管道", type="primary"):
        with st.spinner("安全稽核中 (個資偵測 -> 去識別化 -> 殘留個資掃描 -> 本地模型合規性稽核)..."):
            try:
                res = export_safe(full_path, anonymize_mode=anonymize_mode)
                
                # 檢查是否通過安全標準
                if res.is_safe_for_cloud and res.chinese_model_check_passed:
                    st.success("🎉 安全核可完成！檔案已安全輸出。")
                else:
                    st.warning("⚠️ 警告：安全核可完成，但偵測到個資殘留或安全稽核警示，請務必詳閱檢查報告！")
                    
                # 顯示報告內容
                st.markdown("### 📋 隱私安全檢查報告預覽 (PRIVACY_CHECK_REPORT)")
                
                # 讀取剛剛生成的報告展示
                with open(res.report_file_path, "r", encoding="utf-8") as f:
                    report_md = f.read()
                    
                st.markdown(report_md)
                
                # 下載按鈕
                st.markdown("### 📥 下載安全版檔案")
                with open(res.safe_file_path, "rb") as sf:
                    st.download_button(
                        label="📥 下載 SAFE_FOR_CLOUD 安全版檔案",
                        data=sf,
                        file_name=os.path.basename(res.safe_file_path),
                        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    )
                    
            except Exception as e:
                st.error(f"輸出失敗：{e}")
