import sys
import os
import pandas as pd
import streamlit as st

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from scripts.audit_environment import audit_all, generate_markdown_report, AuditSeverity

st.set_page_config(page_title="安全檢查 - 本地隱私資料查核工作台", page_icon="🛡️", layout="wide")

st.title("🛡️ 本地 AI 模型與環境安全檢查")
st.write("稽核本地模型是否符合非中國來源白名單，以及系統環境是否存在 API Key 洩漏等風險。")

if st.button("🔄 立即執行安全稽核", type="primary"):
    with st.spinner("執行全套環境審計中..."):
        report = audit_all()
        
        # 顯示整體評級
        if report.overall_status == "critical":
            st.error("🔴 **嚴重安全警示**：系統發現可能存在機密外洩或不合規的工具鏈配置！請立即依建議處理。")
        elif report.overall_status == "warning":
            st.warning("🟡 **安全風險提醒**：發現部分潛在風險或未在白名單的自定義模型。")
        else:
            st.success("💚 **安全合規通過**：本機環境未發現任何機密外洩或中國來源 AI 工具鏈。")
            
        # 統計卡片
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("嚴重隱患 (CRITICAL)", report.critical_count)
        with col2:
            st.metric("安全風險 (WARNING)", report.warning_count)
        with col3:
            st.metric("安全項目 (PASS)", report.pass_count)
            
        st.markdown("---")
        
        # 將 Pydantic 模型轉為表格展現
        data = []
        for f in report.findings:
            sev_icon = "🔴 CRITICAL" if f.severity == AuditSeverity.CRITICAL else ("🟡 WARNING" if f.severity == AuditSeverity.WARNING else "🟢 PASS")
            data.append({
                "檢查項目": f.check_name,
                "危險等級": sev_icon,
                "結果說明": f.description,
                "詳細資訊": f.details if f.details else "無",
                "處置處方": f.recommendation if f.recommendation else "無安全隱憂"
            })
            
        df_findings = pd.DataFrame(data)
        st.dataframe(df_findings, use_container_width=True)
        
        # 輸出完整 Markdown 報告以利保存
        st.markdown("### 📝 Markdown 稽核報告存檔")
        md_text = generate_markdown_report(report)
        st.text_area("報告內容", md_text, height=300)
else:
    st.info("請點擊上方按鈕執行安全稽核。")
