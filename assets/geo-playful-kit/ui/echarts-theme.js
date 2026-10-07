(function () {
  if (typeof echarts === "undefined") return;
  echarts.registerTheme("geo-playful", {
    color: ["#3DA5F5", "#1FBFA8", "#FFC24B", "#FF6B6B", "#A77BEA"],
    backgroundColor: "transparent",
    textStyle: {
      color: "#2D251A",
      fontFamily: '"Microsoft JhengHei","Noto Sans TC",sans-serif'
    },
    title: { textStyle: { color: "#2D251A", fontWeight: 800 } },
    legend: { textStyle: { color: "#2D251A" } },
    grid: { borderColor: "rgba(45,37,26,0.12)" },
    categoryAxis: {
      axisLine: { lineStyle: { color: "rgba(45,37,26,0.18)" } },
      axisTick: { show: false },
      splitLine: { show: true, lineStyle: { color: "rgba(45,37,26,0.08)" } }
    },
    valueAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "rgba(45,37,26,0.08)" } }
    },
    bar: { itemStyle: { borderRadius: [8, 8, 0, 0] } },
    line: { smooth: true, symbol: "circle", symbolSize: 8, lineStyle: { width: 3 } },
    pie: { itemStyle: { borderRadius: 8, borderColor: "#FFF9F2", borderWidth: 3 } },
    tooltip: {
      backgroundColor: "#FFFFFF",
      borderColor: "rgba(45,37,26,0.12)",
      textStyle: { color: "#2D251A" },
      extraCssText: "border-radius:12px;box-shadow:0 10px 24px rgba(45,37,26,.12);"
    }
  });
})();
