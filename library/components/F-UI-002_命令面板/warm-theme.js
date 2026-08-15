/* ============================================================
 * 個案管理系統 暖意版互動 — 沒有 framework，純 vanilla。
 *
 * 提供：
 *   - DcmsWarm.countUp(el, to, opts)
 *   - DcmsWarm.bentoPulse(el, ms)
 *   - DcmsWarm.revealWorkerBars(containerSelector)
 *   - DcmsWarm.chartTheme  / chartAnim()
 *   - DcmsWarm.openDrawer / closeDrawer（drawer 動畫 + scroll-lock）
 * ============================================================ */
(function (global) {
  "use strict";

  function clamp01(p) { return Math.max(0, Math.min(1, p)); }
  function easeOutCubic(p) { return 1 - Math.pow(1 - p, 3); }

  /* ── a11y · 偵測使用者是否要求減少動態效果 ───────────── */
  function prefersReducedMotion() {
    return typeof window !== "undefined"
      && window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* ── 動畫數字 ──────────────────────────────────────────── */
  function countUp(el, to, opts) {
    opts = opts || {};
    const format = opts.format || (n => Math.round(n).toLocaleString());
    if (prefersReducedMotion()) {
      el.textContent = format(to);
      return;
    }
    const duration = opts.duration || 1400;
    const from = (typeof opts.from === "number") ? opts.from : 0;
    const start = performance.now();

    function tick(now) {
      const p = clamp01((now - start) / duration);
      const e = easeOutCubic(p);
      el.textContent = format(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ── KPI pulse ────────────────────────────────────────── */
  function bentoPulse(el, ms) {
    if (!el) return;
    if (prefersReducedMotion()) return;
    el.classList.add("is-pulsing");
    setTimeout(() => el.classList.remove("is-pulsing"), ms || 2400);
  }

  /* ── 量能 bar reveal（stagger 80ms × idx） ─────────────── */
  function revealWorkerBars(containerSel) {
    const root = (typeof containerSel === "string")
      ? document.querySelector(containerSel) : containerSel;
    if (!root) return;
    const reduce = prefersReducedMotion();
    const rows = root.querySelectorAll(".wrow");
    rows.forEach((row, idx) => {
      const segs = row.querySelectorAll(".bars .seg");
      segs.forEach(seg => {
        const target = seg.dataset.width || "0%";
        if (reduce) {
          seg.style.width = target;
        } else {
          seg.style.width = "0%";
          setTimeout(() => { seg.style.width = target; }, 80 + idx * 80);
        }
      });
    });
  }

  /* ── ECharts 共用 theme + animation 設定 ───────────────── */
  const chartTheme = {
    colors:     ["#d97757", "#4e9d6c", "#4f8cb8", "#e89545", "#9876a8", "#357341", "#a83a2c"],
    grade:      ["#a83a2c", "#b66319", "#357341", "#2f6595", "#6b4a8b"],
    axisLine:   "#a0917a",
    axisLabel:  "#7a6953",
    splitLine:  "#ecdfca",
    textPrimary:"#2d251a",
  };

  function chartAnim(mul) {
    if (prefersReducedMotion()) {
      return { animation: false };
    }
    const m = (typeof mul === "number") ? mul : 1;
    return {
      animation: true,
      animationDuration: 1200 * m,
      animationEasing: "cubicOut",
      animationDelay: (i) => i * 80 * m,
      animationDurationUpdate: 900 * m,
      animationEasingUpdate: "cubicInOut",
    };
  }

  /* ── Drawer：open / close 動畫 + scroll lock + focus trap ─ */
  let _drawerKeydown = null;
  let _drawerPrevFocus = null;

  const FOCUSABLE_SEL = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function focusableIn(root) {
    if (!root) return [];
    return Array.prototype.filter.call(
      root.querySelectorAll(FOCUSABLE_SEL),
      el => el.offsetParent !== null  // 排除 display:none / hidden
    );
  }

  function openDrawer(drawerEl, scrimEl, onClose) {
    if (!drawerEl) return;
    if (scrimEl) {
      scrimEl.style.display = "block";
    }
    drawerEl.style.display = "flex";
    // 下一個 frame 加 is-open，觸發 transition
    requestAnimationFrame(() => {
      drawerEl.classList.add("is-open");
      if (scrimEl) scrimEl.classList.add("is-open");
    });
    document.documentElement.style.overflow = "hidden";

    // focus trap：記住來源 element，把 focus 移到 drawer 內首個 focusable
    _drawerPrevFocus = document.activeElement;
    requestAnimationFrame(() => {
      const items = focusableIn(drawerEl);
      if (items.length) items[0].focus();
    });

    _drawerKeydown = (e) => {
      if (e.key === "Escape") {
        closeDrawer(drawerEl, scrimEl, onClose);
        return;
      }
      if (e.key === "Tab") {
        const items = focusableIn(drawerEl);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener("keydown", _drawerKeydown);
  }

  function closeDrawer(drawerEl, scrimEl, onClose) {
    if (!drawerEl) return;
    drawerEl.classList.remove("is-open");
    if (scrimEl) scrimEl.classList.remove("is-open");
    document.documentElement.style.overflow = "";
    if (_drawerKeydown) {
      document.removeEventListener("keydown", _drawerKeydown);
      _drawerKeydown = null;
    }
    // focus 還給開啟者
    if (_drawerPrevFocus && typeof _drawerPrevFocus.focus === "function") {
      try { _drawerPrevFocus.focus(); } catch (_) {}
    }
    _drawerPrevFocus = null;
    // 等動畫結束再 display:none
    setTimeout(() => {
      drawerEl.style.display = "none";
      if (scrimEl) scrimEl.style.display = "none";
      if (typeof onClose === "function") onClose();
    }, 600);
  }

  /* ── 自動掃描 [data-countup] 元素 ──────────────────────── */
  function autoCountUp(root) {
    (root || document).querySelectorAll("[data-countup]").forEach(el => {
      const to = parseFloat(el.dataset.countup);
      if (Number.isNaN(to)) return;
      const suffix = el.dataset.countupSuffix || "";
      const dur = parseInt(el.dataset.countupDuration || "1400", 10);
      countUp(el, to, {
        duration: dur,
        format: (n) => Math.round(n).toLocaleString() + suffix,
      });
    });
  }

  /* ── 自動掃描 worker bar containers ────────────────────── */
  function autoRevealBars(root) {
    (root || document).querySelectorAll("[data-warm-bars]").forEach(el => revealWorkerBars(el));
  }

  document.addEventListener("DOMContentLoaded", () => {
    autoCountUp(document);
    autoRevealBars(document);
  });

  // ── Step 13：⌘K / Ctrl+K Command Palette ─────────────────────────────
  // Alpine x-data factory，由 _components/command_palette.html 引用
  global.commandPalette = function () {
    const navItemsAll = [
      { id: "nav-dash",    label: "工作儀表板",  href: "/",            meta: "Alt+1", roles: ["worker", "admin"] },
      { id: "nav-cases",   label: "個案清單",    href: "/cases/",      meta: "Alt+2", roles: ["worker", "admin"] },
      { id: "nav-assign",  label: "派案中心",    href: "/assignment/", meta: "Alt+3", roles: ["admin"] },
      { id: "nav-reports", label: "報表與圖表",  href: "/reports/",    meta: "Alt+4", roles: ["admin"] },
      { id: "nav-merges",  label: "併案待審",    href: "/pdf/pending-merges", meta: "Alt+5", roles: ["admin"] },
      { id: "nav-map",     label: "地圖視圖",    href: "/map/",        meta: "Alt+6", roles: ["worker", "admin"] },
      { id: "nav-admin",   label: "系統設定",    href: "/admin/",      meta: "Alt+7", roles: ["admin"] },
    ];
    const actionItemsAll = [
      { id: "act-new",     label: "新增個案",         href: "/cases/new",       meta: "建立空白案件",     roles: ["worker", "admin"] },
      { id: "act-detect",  label: "重新偵測 PDF",     href: "/pdf/detect",      meta: "掃描收件夾", roles: ["worker", "admin"] },
      { id: "act-inbox",   label: "開啟 PDF 收件夾",  href: "/pdf/open-inbox",  meta: "開啟檔案總管", roles: ["worker", "admin"] },
      { id: "act-imports", label: "PDF 匯入清單",     href: "/pdf/",            meta: "查看待處理 PDF", roles: ["worker", "admin"] },
    ];

    function curRole() {
      const el = document.body;
      return (el && el.getAttribute("data-bg")) || "worker";
    }
    function filtRole(items) {
      const r = curRole();
      return items.filter(it => it.roles.includes(r));
    }
    function escapeHtml(s) {
      return String(s || "").replace(/[&<>"']/g, c => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
      ));
    }

    return {
      // 注意：屬性不可命名為 open！會與原生 window.open 撞名，
      // Alpine 在 with-scope 評估時可能解析到 window.open（truthy 函式），
      // 導致 :class 永遠判定為開啟。改用 isOpen。
      isOpen: false,
      query: "",
      loading: false,
      caseResults: [],
      selGroup: 0,
      selIdx: 0,
      _seq: 0,

      init() {
        const self = this;
        document.addEventListener("keydown", (e) => {
          // Ctrl+K / Cmd+K 開啟（攔截瀏覽器網址列搜尋）
          if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
            e.preventDefault();
            if (self.isOpen) { self.close(); } else { self.show(); }
            return;
          }
          // ESC 全域關閉（不靠 Alpine attribute，避免 attribute 失效時卡死）
          if (e.key === "Escape" && self.isOpen) {
            e.preventDefault();
            self.close();
            return;
          }
          // Alt+1..7：直接前往對應導航項（與面板徽章一致，依角色過濾）
          // 用 e.code 的 DigitN（實體鍵）判定，避免不同鍵盤佈局 Alt+數字 產生特殊字元
          const dm = /^Digit([1-7])$/.exec(e.code || "");
          if (dm && e.altKey && !e.ctrlKey && !e.metaKey) {
            const target = navItemsAll.find(it => it.meta === "Alt+" + dm[1]);
            if (target && target.roles.includes(curRole())) {
              e.preventDefault();
              self.executeItem(target);
            }
          }
        });
        // popstate 自動關閉
        window.addEventListener("popstate", () => self.close());
      },

      show() {
        this.isOpen = true;
        this.$nextTick(() => {
          const inp = this.$refs.search;
          if (inp) { inp.value = this.query; inp.focus(); inp.select(); }
        });
      },
      close() {
        this.isOpen = false;
        this.selGroup = 0;
        this.selIdx = 0;
      },

      get groups() {
        const q = this.query.trim();
        const isActionOnly = q.startsWith(">");
        const qLow = (isActionOnly ? q.slice(1) : q).toLowerCase().trim();

        const matchText = (label, meta) => {
          if (!qLow) return true;
          return (label.toLowerCase().includes(qLow) || (meta || "").toLowerCase().includes(qLow));
        };

        const navs = filtRole(navItemsAll).filter(it => matchText(it.label, it.meta));
        const acts = filtRole(actionItemsAll).filter(it => matchText(it.label, it.meta));

        const result = [];
        // 案件（query 長度足夠才查；action-only 模式不顯示）
        if (!isActionOnly && this.caseResults.length > 0) {
          result.push({ id: "cases", label: "個案", items: this.caseResults });
        }
        if (navs.length > 0) result.push({ id: "nav", label: "前往", items: navs });
        if (acts.length > 0) result.push({ id: "act", label: "動作", items: acts });
        return result;
      },
      get totalCount() {
        return this.groups.reduce((a, g) => a + g.items.length, 0);
      },

      async onSearch() {
        const q = this.query.trim();
        const isActionOnly = q.startsWith(">");
        this.selGroup = 0;
        this.selIdx = 0;
        if (isActionOnly || q.length < 2) {
          this.caseResults = [];
          this.loading = false;
          return;
        }
        const seq = ++this._seq;
        this.loading = true;
        try {
          const res = await fetch("/api/search?q=" + encodeURIComponent(q) + "&scope=own", {
            headers: { "Accept": "application/json" }
          });
          if (seq !== this._seq) return; // 過時結果丟棄
          const data = await res.json();
          this.caseResults = (data.items || []).slice(0, 8).map(c => ({
            id: "case-" + c.case_id,
            label: c.name || "（無姓名）",
            meta: [c.case_no, c.ref_no, c.assignee_name || c.assignee].filter(Boolean).join(" · "),
            href: "/cases/?case=" + c.case_id,
            icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M8 6V4h8v2"/></svg>',
            hint: c.service_grade ? ("分級 " + escapeHtml(c.service_grade)) : "",
          }));
        } catch (err) {
          this.caseResults = [];
        } finally {
          if (seq === this._seq) this.loading = false;
        }
      },

      iconFor(groupId) {
        if (groupId === "nav") return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M9 7h8v8"/></svg>';
        if (groupId === "act") return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>';
        return '';
      },

      selectNext() {
        const groups = this.groups;
        if (groups.length === 0) return;
        let g = this.selGroup, i = this.selIdx;
        if (i + 1 < groups[g].items.length) { i++; }
        else if (g + 1 < groups.length) { g++; i = 0; }
        else { g = 0; i = 0; }
        this.selGroup = g; this.selIdx = i;
        this._scrollSelectedIntoView();
      },
      selectPrev() {
        const groups = this.groups;
        if (groups.length === 0) return;
        let g = this.selGroup, i = this.selIdx;
        if (i > 0) { i--; }
        else if (g > 0) { g--; i = groups[g].items.length - 1; }
        else { g = groups.length - 1; i = groups[g].items.length - 1; }
        this.selGroup = g; this.selIdx = i;
        this._scrollSelectedIntoView();
      },
      _scrollSelectedIntoView() {
        this.$nextTick(() => {
          const el = this.$refs.results && this.$refs.results.querySelector(".cmd-item.is-active");
          if (el) el.scrollIntoView({ block: "nearest" });
        });
      },
      executeSelected() {
        const groups = this.groups;
        if (groups.length === 0) return;
        const item = groups[this.selGroup] && groups[this.selGroup].items[this.selIdx];
        if (item) this.executeItem(item);
      },
      executeItem(item) {
        if (!item) return;
        this.close();
        if (item.href) {
          // 與當前 URL 相同 → 強制 reload；不同 → assign 帶 history
          if (item.href === window.location.pathname + window.location.search) {
            window.location.reload();
          } else {
            window.location.href = item.href;
          }
        }
      },
      onGlobalKey(e) {
        // Alt+數字 直跳導航已在 init() 的全域 keydown 監聽器實作
      },
    };
  };

  global.DcmsWarm = {
    countUp,
    bentoPulse,
    revealWorkerBars,
    chartTheme,
    chartAnim,
    openDrawer,
    closeDrawer,
    autoCountUp,
    autoRevealBars,
    prefersReducedMotion,
  };
})(window);
