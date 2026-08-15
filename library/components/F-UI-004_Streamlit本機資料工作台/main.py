import sys
import os
import yaml
import streamlit as st

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from scripts.call_local_llm import check_llm_available, parse_task_json, get_available_models, load_settings
from scripts.audit_environment import audit_all

st.set_page_config(
    page_title="本地隱私資料查核工作台",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 套用精緻的深色/科技感 Vanilla CSS 樣式
st.markdown("""
<style>
    .main {
        background-color: #0f172a;
        color: #f1f5f9;
        font-family: 'Outfit', 'Inter', 'Segoe UI', sans-serif;
    }
    .stAppHeader {
        background-color: #0f172a;
    }
    h1 {
        background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: 800;
        letter-spacing: -0.025em;
        margin-bottom: 0.5rem;
    }
    .card {
        background-color: #1e293b;
        border-radius: 12px;
        padding: 24px;
        border: 1px solid #334155;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        margin-bottom: 20px;
    }
    .status-panel {
        background-color: #0f172a;
        border-left: 4px solid #3b82f6;
        padding: 12px 16px;
        margin-bottom: 16px;
        border-radius: 4px;
    }
    .metric-value {
        font-size: 2rem;
        font-weight: 700;
        color: #38bdf8;
    }
    .sidebar .sidebar-content {
        background-color: #1e293b;
    }
</style>
""", unsafe_allow_html=True)

st.title("🛡️ 本地隱私資料查核工作台")
st.caption("private-data-workbench — 專屬 Windows 本地、完全離線、非中國來源、可稽核的個資安全處理平台")

# 初始化 Session State
if "last_query" not in st.session_state:
    st.session_state.last_query = ""
if "parsed_task" not in st.session_state:
    st.session_state.parsed_task = None
if "selected_model" not in st.session_state:
    st.session_state.selected_model = None
if "selected_runner" not in st.session_state:
    st.session_state.selected_runner = "ollama"

# 載入設定
settings = load_settings()
llm_enabled = settings.get("llm", {}).get("enabled", False)

# 系統狀態側邊欄
with st.sidebar:
    st.markdown("### ⚙️ 系統運行狀態")
    
    # 執行安全稽核
    audit_res = audit_all()
    if audit_res.overall_status == "critical":
        st.error("🔴 安全警告：環境有嚴重安全隱憂！")
    elif audit_res.overall_status == "warning":
        st.warning("🟡 安全警告：發現潛在風險！")
    else:
        st.success("🟢 系統安全評級：安全無虞")
        
    st.markdown("---")
    st.markdown("### 🤖 本地 AI 設定")
    
    runner = st.selectbox("LLM 運行平台", ["ollama", "lm_studio"], index=0)
    st.session_state.selected_runner = runner
    
    # 檢查可用性
    is_available = check_llm_available(runner)
    if is_available:
        st.success(f"本地 {runner} 服務：連線成功")
        models = get_available_models(runner)
        if models:
            model = st.selectbox("選擇模型", models)
            st.session_state.selected_model = model
        else:
            st.warning("服務已啟動但未偵測到模型")
    else:
        st.error(f"本地 {runner} 服務：未偵測到服務 (已降級為手動表單)")
        
    st.markdown("---")
    st.markdown("### 📁 專案位置")
    st.info(f"根目錄：\n`{PROJECT_ROOT}`")

# 介紹面板
col1, col2, col3 = st.columns(3)
with col1:
    st.markdown("""
    <div class="card">
        <h3>🔍 確定性資料處理</h3>
        <p>查找、核對、統計與去識別化皆由本地 Python 程式 (Pandas, DuckDB) <b>100% 精準執行</b>，LLM 絕不參與查核判斷，防止產生幻覺或個資外流。</p>
    </div>
    """, unsafe_allow_html=True)
with col2:
    st.markdown("""
    <div class="card">
        <h3>🛑 嚴格禁用中國 AI</h3>
        <p>系統內建嚴格的安全審計機網，<b>全面封鎖且絕不下載、載入、使用或 Fallback</b> 任何中國來源的模型、微調/量化版與軟體框架。</p>
    </div>
    """, unsafe_allow_html=True)
with col3:
    st.markdown("""
    <div class="card">
        <h3>🌥️ 雲端傳輸安全閘</h3>
        <p>提供專用的雲端輸出流程，強制在匯出前進行個資殘留掃描與安全稽核，並產生含有 18 項檢查點的核對報告。</p>
    </div>
    """, unsafe_allow_html=True)

# 自然語言入口 (LLM 輔助)
st.markdown("## 💬 本地自然語言任務解析 (選用)")
st.write("您可以直接輸入自然語言指令，本地 LLM 會將其解析成任務 JSON，但實際運作仍會由本機程式執行。")

user_prompt = st.text_input(
    "請輸入自然語言指令 (例如：幫我把這份 Excel 的姓名、電話去識別化 / 幫我比對這兩份名單是否重複)",
    placeholder="在此輸入您的指令...",
    value=st.session_state.last_query
)

if st.button("🚀 任務解析", type="primary"):
    if user_prompt:
        st.session_state.last_query = user_prompt
        
        # 進行解析
        with st.spinner("本地模型任務解析中..."):
            try:
                task_res = parse_task_json(
                    user_prompt,
                    model=st.session_state.selected_model,
                    runner=st.session_state.selected_runner
                )
                st.session_state.parsed_task = task_res
                st.success("任務解析成功！")
            except Exception as e:
                st.error(f"任務解析失敗：{e}")
                st.info("系統已自動改用手動操作模式，請在左側選單選擇功能進行手動核對。")
                
# 展示解析結果
if st.session_state.parsed_task:
    task = st.session_state.parsed_task
    st.markdown("### 📋 解析出的任務結構 (JSON)")
    st.json(task.dict())
    
    # 根據 task_type 給予跳轉引導
    page_mapping = {
        "keyword_search": "2_關鍵字查找",
        "compare": "3_資料核對",
        "anonymize": "4_個資隱匿",
        "statistics": "5_統計計算",
        "export": "6_輸出給雲端AI",
        "audit": "7_模型與安全檢查"
    }
    
    target_page = page_mapping.get(task.task_type)
    if target_page:
        st.info(f"💡 系統建議：請點擊左側選單的 **{target_page}** 頁面來執行此任務。")

st.markdown("---")
st.markdown("### 🧭 快速使用指南")
st.markdown("""
1. **資料匯入**：在左側選單點擊 [1_資料匯入] 拖放您的公務原始檔案，系統會將其安全儲存至 DuckDB 資料庫並建立欄位大綱。
2. **搜尋與核對**：點擊 [2_關鍵字查找] 或 [3_資料核對] 即可執行精準/模糊搜尋與雙表比對。
3. **個資去識別化**：點擊 [4_個資隱匿] 可自由選擇遮蔽、替換假資料或完全移除，並將一致性對照表保存在本地 SQLite 中。
4. **雲端 AI 輸出**：點擊 [6_輸出給雲端AI] 執行殘留個資校驗與工具稽核，生成 `SAFE_FOR_CLOUD` 檔案。
""")
