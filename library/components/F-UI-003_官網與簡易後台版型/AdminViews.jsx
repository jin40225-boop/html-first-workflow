// Admin view panels — Overview, News (CRUD + drawer), Pages, Members, Settings
const { useState: _uS, useEffect: _uE } = React;

const NEWS_CATS = ["會員招募", "協會公告", "活動預告", "活動花絮"];
const NEWS_ICONS = [
  { v: "megaphone", l: "喇叭・公告" },
  { v: "users-round", l: "人群・招募" },
  { v: "sprout", l: "萌芽・成立" },
  { v: "wind", l: "微風・放鬆" },
  { v: "calendar-heart", l: "行事曆・活動" },
  { v: "heart-handshake", l: "牽手・服務" },
  { v: "sparkles", l: "閃耀・花絮" },
];
const STATUSES = ["已繳費", "審查中"];
const MTYPES = ["個人會員", "團體會員", "贊助會員"];

function catDot(cat) {
  const m = {
    "會員招募": { bg: "var(--mint-100)", c: "#5A8A74" },
    "協會公告": { bg: "var(--sky-100)", c: "#3E7E8C" },
    "活動預告": { bg: "var(--peach-100)", c: "#C0764A" },
    "活動花絮": { bg: "var(--butter-100)", c: "#A9803B" },
  };
  return m[cat] || { bg: "var(--teal-100)", c: "#3E7E8C" };
}
function dot(d) { return (d || "").replaceAll("-", "."); }

/* ============ Overview ============ */
function Overview({ setView }) {
  const s = useStore();
  const published = s.news.filter((n) => n.published).length;
  const paid = s.members.filter((m) => m.status === "已繳費").length;
  const STATS = [
    { ic: "megaphone", bg: "var(--mint-100)", c: "#5A8A74", num: s.news.length, lbl: "消息總數" },
    { ic: "eye", bg: "var(--sky-100)", c: "#3E7E8C", num: published, lbl: "已發布消息" },
    { ic: "users-round", bg: "var(--peach-100)", c: "#C0764A", num: s.members.length, lbl: "會員人數" },
    { ic: "badge-check", bg: "var(--butter-100)", c: "#A9803B", num: paid, lbl: "已繳費會員" },
  ];
  const recent = s.news.slice(0, 4);
  const pending = s.members.filter((m) => m.status === "審查中");
  return (
    <>
      <div className="stats">
        {STATS.map((x, i) => (
          <div className="stat" key={i}>
            <div className="ic" style={{ background: x.bg }}><Icon name={x.ic} style={{ color: x.c }} /></div>
            <div className="num">{x.num}</div>
            <div className="lbl">{x.lbl}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 22, alignItems: "start" }} className="ov-grid">
        <div className="panel">
          <div className="panel-head">
            <h3>近期消息</h3>
            <div className="spacer"></div>
            <button className="btn btn-secondary btn-sm" onClick={() => setView("news")}><Icon name="arrow-right" />前往管理</button>
          </div>
          <div className="panel-pad" style={{ paddingTop: 8, paddingBottom: 8 }}>
            <div className="recent">
              {recent.map((n) => {
                const d = catDot(n.category);
                return (
                  <div className="r" key={n.id}>
                    <div className="dot" style={{ background: d.bg }}><Icon name={n.icon} style={{ color: d.c }} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="t" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</div>
                      <div className="d">{dot(n.date)}・{n.category}</div>
                    </div>
                    <span className={"pill " + (n.published ? "pill-on" : "pill-off")}>{n.published ? "已發布" : "草稿"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div className="panel panel-pad">
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--ink-head)", margin: "0 0 4px" }}>快速操作</h3>
            <p style={{ fontSize: 14, color: "var(--ink-muted)", margin: "0 0 16px" }}>常用的內容維護入口。</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button className="btn btn-primary" style={{ justifyContent: "flex-start" }} onClick={() => setView("news")}><Icon name="plus" />發布新消息</button>
              <button className="btn btn-secondary" style={{ justifyContent: "flex-start" }} onClick={() => setView("pages")}><Icon name="file-pen" />編輯頁面內容</button>
              <button className="btn btn-secondary" style={{ justifyContent: "flex-start" }} onClick={() => setView("members")}><Icon name="users-round" />查看會員名單</button>
            </div>
          </div>

          <div className="panel panel-pad">
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--ink-head)", margin: "0 0 4px" }}>待審查會員</h3>
            {pending.length === 0 ? (
              <p style={{ fontSize: 14, color: "var(--ink-muted)", margin: "8px 0 0" }}>目前沒有待審查的申請。</p>
            ) : (
              <div className="recent" style={{ marginTop: 4 }}>
                {pending.map((m) => (
                  <div className="r" key={m.id}>
                    <div className="dot" style={{ background: "var(--butter-100)" }}><Icon name="user-round" style={{ color: "#A9803B" }} /></div>
                    <div style={{ flex: 1 }}>
                      <div className="t">{m.name}</div>
                      <div className="d">{m.type}・{dot(m.date)}</div>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setView("members")}>處理</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ============ News editor drawer ============ */
function emptyNews() {
  const today = new Date().toISOString().slice(0, 10);
  return { title: "", category: "協會公告", icon: "megaphone", date: today, excerpt: "", body: "", published: true };
}

function NewsDrawer({ item, onClose, toast }) {
  const isNew = !item.id;
  const [f, setF] = _uS({ ...emptyNews(), ...item });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = () => {
    if (!f.title.trim()) { toast("請填寫消息標題"); return; }
    if (isNew) { WDStore.addNews(f); toast("已發布新消息"); }
    else { WDStore.updateNews(item.id, f); toast("已更新消息"); }
    onClose();
  };
  const remove = () => {
    if (!confirm("確定要刪除這則消息嗎？")) return;
    WDStore.deleteNews(item.id); toast("已刪除消息"); onClose();
  };
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h3>{isNew ? "新增消息" : "編輯消息"}</h3>
          <div className="spacer"></div>
          <button className="iconbtn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="drawer-body">
          <div className="f full">
            <label>標題</label>
            <input value={f.title} onChange={set("title")} placeholder="消息標題" />
          </div>
          <div className="fgrid">
            <div className="f">
              <label>分類</label>
              <select value={f.category} onChange={set("category")}>
                {NEWS_CATS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="f">
              <label>日期</label>
              <input type="date" value={f.date} onChange={set("date")} />
            </div>
          </div>
          <div className="f full">
            <label>圖示</label>
            <select value={f.icon} onChange={set("icon")}>
              {NEWS_ICONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
            <div className="hint">顯示於消息卡片的小圖示，搭配分類色彩。</div>
          </div>
          <div className="f full">
            <label>摘要</label>
            <textarea value={f.excerpt} onChange={set("excerpt")} placeholder="列表上顯示的一兩句重點" style={{ minHeight: 70 }}></textarea>
          </div>
          <div className="f full">
            <label>內文</label>
            <textarea value={f.body} onChange={set("body")} placeholder="點開消息後的完整內容" style={{ minHeight: 150 }}></textarea>
          </div>
          <div className="f full" style={{ marginBottom: 0 }}>
            <Toggle on={f.published} onChange={(v) => setF({ ...f, published: v })} label={f.published ? "已發布於官網" : "儲存為草稿（不公開）"} />
          </div>
        </div>
        <div className="drawer-foot">
          {!isNew && <button className="btn btn-danger" onClick={remove}><Icon name="trash-2" />刪除</button>}
          <div className="spacer" style={{ flex: 1 }}></div>
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={save}><Icon name="check" />{isNew ? "發布" : "儲存"}</button>
        </div>
      </div>
    </div>
  );
}

/* ============ News manager ============ */
function NewsAdmin({ toast }) {
  const s = useStore();
  const [editing, setEditing] = _uS(null); // {} for new, item for edit
  _uE(() => {
    const h = () => setEditing({});
    window.addEventListener("wd-news-add", h);
    return () => window.removeEventListener("wd-news-add", h);
  }, []);
  return (
    <>
      <div className="panel">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: "46%" }}>標題</th>
              <th>分類</th>
              <th>日期</th>
              <th>狀態</th>
              <th style={{ textAlign: "right" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {s.news.map((n) => {
              const d = catDot(n.category);
              return (
                <tr className="rowhover" key={n.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="dot" style={{ width: 34, height: 34, borderRadius: 10, background: d.bg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                        <Icon name={n.icon} style={{ color: d.c, width: 17, height: 17 }} />
                      </span>
                      <span className="t-title">{n.title}</span>
                    </div>
                  </td>
                  <td><span className="pill pill-cat" style={{ background: d.bg, color: d.c }}>{n.category}</span></td>
                  <td style={{ fontFamily: "Nunito", color: "var(--ink-muted)" }}>{dot(n.date)}</td>
                  <td><span className={"pill " + (n.published ? "pill-on" : "pill-off")}>{n.published ? "已發布" : "草稿"}</span></td>
                  <td>
                    <div className="actions">
                      <button className="iconbtn" title="編輯" onClick={() => setEditing(n)}><Icon name="pencil" /></button>
                      <button className="iconbtn del" title="刪除" onClick={() => { if (confirm("確定要刪除這則消息嗎？")) { WDStore.deleteNews(n.id); toast("已刪除消息"); } }}><Icon name="trash-2" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && <NewsDrawer item={editing} onClose={() => setEditing(null)} toast={toast} />}
    </>
  );
}

/* ============ Pages content editor ============ */
function Section({ title, desc, children, onSave }) {
  return (
    <div className="panel" style={{ marginBottom: 22 }}>
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          {desc && <p style={{ margin: "3px 0 0", fontSize: 13.5, color: "var(--ink-muted)" }}>{desc}</p>}
        </div>
        <div className="spacer"></div>
        <button className="btn btn-primary btn-sm" onClick={onSave}><Icon name="check" />儲存</button>
      </div>
      <div className="panel-pad">{children}</div>
    </div>
  );
}

function Pages({ toast }) {
  const s = useStore().site;
  const [hero, setHero] = _uS(s.hero);
  const [about, setAbout] = _uS(s.about);
  const [contact, setContact] = _uS(s.contact);
  const [misc, setMisc] = _uS({ membershipNote: s.membershipNote, footerTagline: s.footerTagline });
  const hf = (k) => (e) => setHero({ ...hero, [k]: e.target.value });
  const af = (k) => (e) => setAbout({ ...about, [k]: e.target.value });
  const cf = (k) => (e) => setContact({ ...contact, [k]: e.target.value });
  const mf = (k) => (e) => setMisc({ ...misc, [k]: e.target.value });

  return (
    <>
      <Section title="首頁主視覺 Hero" desc="網站首頁最上方的標語與引言。" onSave={() => { WDStore.updateSite("hero", hero); toast("已更新首頁主視覺"); }}>
        <div className="f full"><label>小標 Eyebrow</label><input value={hero.eyebrow} onChange={hf("eyebrow")} /></div>
        <div className="fgrid">
          <div className="f"><label>主標 第一行</label><input value={hero.titleA} onChange={hf("titleA")} /></div>
          <div className="f"><label>主標 第二行（前段）</label><input value={hero.titleB} onChange={hf("titleB")} /></div>
          <div className="f"><label>主標 強調字</label><input value={hero.titleHl} onChange={hf("titleHl")} /></div>
          <div className="f"><label>主標 結尾</label><input value={hero.titleC} onChange={hf("titleC")} /></div>
        </div>
        <div className="f full" style={{ marginBottom: 0 }}><label>引言 Lead</label><textarea value={hero.lead} onChange={hf("lead")}></textarea></div>
      </Section>

      <Section title="關於我們 About" desc="關於頁與首頁簡介使用的文字。" onSave={() => { WDStore.updateSite("about", about); toast("已更新關於我們"); }}>
        <div className="f full"><label>會名釋義（副標）</label><input value={about.lead} onChange={af("lead")} /></div>
        <div className="f full"><label>協會介紹</label><textarea value={about.intro} onChange={af("intro")}></textarea></div>
        <div className="f full"><label>緣起（第一段）</label><textarea value={about.origin1} onChange={af("origin1")} style={{ minHeight: 120 }}></textarea></div>
        <div className="f full"><label>緣起（第二段）</label><textarea value={about.origin2} onChange={af("origin2")} style={{ minHeight: 120 }}></textarea></div>
        <div className="f full" style={{ marginBottom: 0 }}><label>引述句 Quote</label><textarea value={about.quote} onChange={af("quote")}></textarea></div>
      </Section>

      <Section title="聯絡資訊 Contact" desc="顯示於聯絡頁與頁尾。" onSave={() => { WDStore.updateSite("contact", contact); toast("已更新聯絡資訊"); }}>
        <div className="fgrid">
          <div className="f"><label>電子信箱</label><input value={contact.email} onChange={cf("email")} /></div>
          <div className="f"><label>LINE 官方帳號</label><input value={contact.line} onChange={cf("line")} /></div>
        </div>
        <div className="f full" style={{ marginBottom: 0 }}><label>組織性質</label><input value={contact.org} onChange={cf("org")} /></div>
      </Section>

      <Section title="其他文案" desc="會員招募說明與頁尾標語。" onSave={() => { WDStore.updateSiteRoot(misc); toast("已更新文案"); }}>
        <div className="f full"><label>會員招募說明</label><textarea value={misc.membershipNote} onChange={mf("membershipNote")}></textarea></div>
        <div className="f full" style={{ marginBottom: 0 }}><label>頁尾標語</label><textarea value={misc.footerTagline} onChange={mf("footerTagline")}></textarea></div>
      </Section>
    </>
  );
}

/* ============ Members ============ */
function Members({ toast }) {
  const s = useStore();
  const [filter, setFilter] = _uS("全部");
  const list = filter === "全部" ? s.members : s.members.filter((m) => m.type === filter);
  const toggleStatus = (m) => {
    const next = m.status === "已繳費" ? "審查中" : "已繳費";
    WDStore.updateMember(m.id, { status: next });
    toast(next === "已繳費" ? "已標記為已繳費" : "已改為審查中");
  };
  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {["全部", ...MTYPES].map((t) => (
          <button key={t} className={"btn btn-sm " + (filter === t ? "btn-primary" : "btn-secondary")} onClick={() => setFilter(t)}>{t}</button>
        ))}
      </div>
      <div className="panel">
        <table className="tbl">
          <thead>
            <tr>
              <th>姓名 / 名稱</th>
              <th>會員類別</th>
              <th>申請日期</th>
              <th>狀態</th>
              <th style={{ textAlign: "right" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((m) => (
              <tr className="rowhover" key={m.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="avatar" style={{ width: 34, height: 34, fontSize: 14, flex: "none" }}>{m.name.slice(0, 1)}</span>
                    <span className="t-title">{m.name}</span>
                  </div>
                </td>
                <td style={{ color: "var(--ink-muted)" }}>{m.type}</td>
                <td style={{ fontFamily: "Nunito", color: "var(--ink-muted)" }}>{dot(m.date)}</td>
                <td>
                  <button className={"pill " + (m.status === "已繳費" ? "pill-paid" : "pill-pending")} style={{ border: "none", cursor: "pointer" }} onClick={() => toggleStatus(m)} title="點擊切換狀態">
                    <Icon name={m.status === "已繳費" ? "check" : "clock"} style={{ width: 13, height: 13 }} />{m.status}
                  </button>
                </td>
                <td>
                  <div className="actions">
                    <button className="iconbtn del" title="刪除" onClick={() => { if (confirm("確定要移除這位會員嗎？")) { WDStore.deleteMember(m.id); toast("已移除會員"); } }}><Icon name="trash-2" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan="5" style={{ textAlign: "center", color: "var(--ink-muted)", padding: "30px 0" }}>沒有符合的會員。</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ============ Settings ============ */
function Settings({ toast, onOut }) {
  const reset = () => {
    if (!confirm("確定要將所有網站內容還原為預設值嗎？此動作無法復原。")) return;
    WDStore.reset(); toast("已還原為預設內容");
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, alignItems: "start" }} className="ov-grid">
      <div className="panel panel-pad">
        <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--ink-head)", margin: "0 0 4px" }}>關於此後台</h3>
        <p style={{ fontSize: 14.5, color: "var(--ink-muted)", lineHeight: 1.7, margin: "0 0 16px" }}>
          這是示範協會官網的示範內容管理系統。所有變更會即時儲存在瀏覽器中，並同步更新已開啟的官網分頁——無需重新整理。
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <a className="btn btn-secondary" style={{ justifyContent: "flex-start" }} href="index.html" target="_blank"><Icon name="external-link" />在新分頁開啟官網</a>
        </div>
      </div>
      <div className="panel panel-pad">
        <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--ink-head)", margin: "0 0 4px" }}>資料管理</h3>
        <p style={{ fontSize: 14.5, color: "var(--ink-muted)", lineHeight: 1.7, margin: "0 0 16px" }}>
          將消息、會員與頁面文字全部還原為初始示範資料；或登出後台。
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn btn-danger" style={{ justifyContent: "flex-start" }} onClick={reset}><Icon name="rotate-ccw" />還原為預設內容</button>
          <button className="btn btn-ghost" style={{ justifyContent: "flex-start" }} onClick={onOut}><Icon name="log-out" />登出後台</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Overview, NewsAdmin, NewsDrawer, Pages, Members, Settings, catDot });
