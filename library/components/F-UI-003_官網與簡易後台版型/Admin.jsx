// Admin core — Login, Shell (sidebar + topbar), shared helpers, router
const { useState, useEffect, useRef } = React;

/* ---- helpers ---- */
function useToast() {
  const [msg, setMsg] = useState(null);
  const show = (m) => { setMsg(m); };
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 2200); return () => clearTimeout(t); }, [msg]);
  const node = msg ? (
    <div className="toast"><Icon name="check-circle" />{msg}</div>
  ) : null;
  return [node, show];
}

function Toggle({ on, onChange, label }) {
  return (
    <div className={"toggle" + (on ? " on" : "")} onClick={() => onChange(!on)}>
      <div className="track"><div className="knob"></div></div>
      {label && <span className="tlabel">{label}</span>}
    </div>
  );
}

function useStore() {
  const [, force] = useState(0);
  useEffect(() => WDStore.subscribe(() => force((n) => n + 1)), []);
  return WDStore.get();
}

/* ---- Login ---- */
function Login({ onIn }) {
  const [email, setEmail] = useState("admin@example.org");
  const submit = (e) => { e.preventDefault(); sessionStorage.setItem("wd_admin", "1"); onIn(); };
  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <img className="lg" src="assets/logo-transparent.png" alt="本會" />
        <h1>示範管理後台</h1>
        <div className="en">White Dew · Admin</div>
        <div className="field">
          <label>電子信箱</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>密碼</label>
          <input type="password" defaultValue="demo1234" required />
        </div>
        <button className="btn btn-primary" type="submit">登入後台<Icon name="arrow-right" /></button>
        <div className="login-hint">這是示範後台，輸入任意帳密即可登入。<br />內容變更會即時反映在官方網站上。</div>
      </form>
    </div>
  );
}

/* ---- Shell ---- */
const ADMIN_NAV = [
  { id: "overview", label: "總覽", icon: "layout-dashboard" },
  { id: "news", label: "最新消息", icon: "megaphone" },
  { id: "pages", label: "頁面內容", icon: "file-pen" },
  { id: "members", label: "會員管理", icon: "users-round" },
  { id: "settings", label: "設定", icon: "settings" },
];

function Shell({ view, setView, onOut, children, title, subtitle, action }) {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const counts = { news: store.news.length };
  const nav = (id) => { setView(id); setOpen(false); };
  return (
    <div className="shell">
      <aside className={"side" + (open ? " open" : "")}>
        <div className="side-brand">
          <img src="assets/logo-transparent.png" alt="本會" />
          <div>
            <div className="zh">示範協會</div>
            <div className="en">Admin</div>
          </div>
        </div>
        <nav className="side-nav">
          {ADMIN_NAV.map((n) => (
            <button key={n.id} className={"navi" + (view === n.id ? " active" : "")} onClick={() => nav(n.id)}>
              <Icon name={n.icon} />{n.label}
              {counts[n.id] != null && <span className="count">{counts[n.id]}</span>}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <a className="navi" href="index.html" target="_blank"><Icon name="external-link" />查看官網</a>
          <button className="navi" onClick={onOut}><Icon name="log-out" />登出</button>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <button className="iconbtn side-toggle" onClick={() => setOpen(!open)}><Icon name="menu" /></button>
          <h2>{ADMIN_NAV.find((n) => n.id === view)?.label}</h2>
          <div className="spacer"></div>
          <a className="btn btn-secondary btn-sm" href="index.html" target="_blank"><Icon name="external-link" />查看官網</a>
          <div className="who"><div className="avatar">白</div></div>
        </div>
        <div className="content">
          <div className="page-head">
            <div className="ph-l">
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
            <div className="spacer"></div>
            {action}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { useToast, Toggle, useStore, Login, Shell, ADMIN_NAV });
