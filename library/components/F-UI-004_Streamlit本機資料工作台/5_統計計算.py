import sys
import os
import pandas as pd
import streamlit as st

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from scripts.import_files import get_imported_files

st.set_page_config(page_title="統計計算 - 本地隱私資料查核工作台", page_icon="📊", layout="wide")

st.title("📊 本地資料統計與計算")
st.write("完全由本機程式實際計算，支援總筆數、缺漏率、重複率以及行政區/日期統計。")

imported_files = get_imported_files()
tables = [f["table_name"] for f in imported_files]
file_map = {f["table_name"]: f"{f['file_name']} -> {f['sheet_name']}" for f in imported_files}

if len(imported_files) < 1:
    st.info("💡 請先前往 [1_資料匯入] 頁面匯入至少一份資料以進行統計。")
else:
    selected_table = st.selectbox("選擇要統計的資料表", tables, format_func=lambda x: file_map.get(x, x))
    
    # 讀取資料
    db_path = os.path.join(PROJECT_ROOT, "database", "local_index.duckdb")
    import duckdb
    conn = duckdb.connect(db_path)
    df = conn.execute(f"SELECT * FROM {selected_table}").df()
    conn.close()
    
    st.markdown("### 📈 基礎統計指標")
    
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("總行數 (筆數)", len(df))
    with col2:
        # 推算唯一姓名或編號去重後筆數
        name_col = next((c for c in df.columns if "姓名" in str(c) or "個案" in str(c) or "案主" in str(c)), None)
        if name_col:
            unique_cnt = df[name_col].nunique()
            st.metric(f"唯一個案數 (去重 {name_col})", unique_cnt)
        else:
            st.metric("唯一列數 (去重所有欄位)", len(df.drop_duplicates()))
    with col3:
        # 疑似個資欄位數
        from scripts.anonymize_private_data import detect_pii_in_dataframe
        report = detect_pii_in_dataframe(df)
        st.metric("疑似含個資欄位數", len(report.pii_columns))
    with col4:
        # 缺漏資料率 (所有儲存格的空值比例)
        total_cells = df.size
        null_cells = df.isna().sum().sum()
        null_rate = (null_cells / total_cells * 100) if total_cells > 0 else 0
        st.metric("平均欄位空值率", f"{null_rate:.1f}%")
        
    st.markdown("---")
    
    # 1. 欄位空值率與類型詳細表
    st.markdown("### 📋 欄位品質與缺漏率統計")
    null_counts = df.isna().sum()
    null_rates = (null_counts / len(df) * 100)
    col_stats = pd.DataFrame({
        "欄位名稱": df.columns,
        "資料型態": [str(t) for t in df.dtypes],
        "缺失值數量": null_counts.values,
        "缺失值比例 (%)": null_rates.apply(lambda x: f"{x:.1f}%").values
    })
    st.dataframe(col_stats, use_container_width=True)
    
    # 2. 行政區分布統計 (若有地址欄位)
    addr_col = next((c for c in df.columns if "地址" in str(c) or "住址" in str(c)), None)
    if addr_col:
        st.markdown("### 🗺️ 行政區/鄉鎮市區分佈統計")
        
        # 試圖抽取台灣鄉鎮市區
        districts = []
        for addr in df[addr_col].dropna():
            m = re.search(r'([\u4e00-\u9fa5]{2,3}(?:區|鄉|鎮|市))', str(addr))
            if m:
                districts.append(m.group(1))
            else:
                districts.append("未識別地區")
                
        df_dist = pd.DataFrame({"行政區": districts})
        dist_counts = df_dist["行政區"].value_counts().reset_index().rename(columns={"count": "筆數"})
        
        col_dist1, col_dist2 = st.columns([1, 2])
        with col_dist1:
            st.dataframe(dist_counts)
        with col_dist2:
            st.bar_chart(dist_counts.set_index("行政區"))
            
    # 3. 日期月份分布統計 (若有日期欄位)
    import re
    date_col = next((c for c in df.columns if "日期" in str(c) or "生日" in str(c) or "時間" in str(c)), None)
    if date_col:
        st.markdown("### 📅 日期/月份分佈統計")
        
        months = []
        for d in df[date_col].dropna():
            # 抓取 YYYY-MM 格式
            m = re.search(r'(\d{4})[-/](\d{1,2})', str(d))
            if m:
                months.append(f"{m.group(1)}-{int(m.group(2)):02d}")
            else:
                months.append("其他日期")
                
        df_month = pd.DataFrame({"月份": months})
        month_counts = df_month["月份"].value_counts().reset_index().rename(columns={"count": "筆數"}).sort_values("月份")
        
        col_m1, col_m2 = st.columns([1, 2])
        with col_m1:
            st.dataframe(month_counts)
        with col_m2:
            st.line_chart(month_counts.set_index("月份"))
            
    # 匯出統計報告
    st.markdown("### 📥 匯出統計報告")
    if st.button("📝 產生 Markdown 統計摘要報告"):
        report_md = f"""# 資料表統計分析報告
資料表：{file_map.get(selected_table, selected_table)}
統計時間：{pd.Timestamp.now().isoformat()}

## 一、基礎指標
- 總記錄數：{len(df)} 筆
- 疑似含個資欄位數：{len(report.pii_columns)} 個

## 二、欄位缺漏率大綱
"""
        for idx, row in col_stats.iterrows():
            report_md += f"- **{row['欄位名稱']}** ({row['資料型態']}): 缺失值數量：{row['缺失值數量']} ({row['缺失值比例 (%)']})\n"
            
        output_dir = os.path.join(PROJECT_ROOT, "02_比對結果")
        os.makedirs(output_dir, exist_ok=True)
        report_path = os.path.join(output_dir, f"stats_report_{selected_table}.md")
        
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(report_md)
            
        st.success(f"報告已成功寫入：`02_比對結果/stats_report_{selected_table}.md`")
        st.text_area("報告預覽", report_md, height=200)
