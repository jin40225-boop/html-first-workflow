// Home screen — circular-embrace hero, store-driven
function Hero({ go }) {
  const h = useStore().site.hero;
  return (
    <section className="hero hero-embrace">
      <Blob color="var(--peach-100)" w="220px" h="220px" style={{ top: "12%", left: "5%" }} />
      <Blob color="var(--butter-100)" w="150px" h="150px" style={{ bottom: "12%", right: "10%" }} />
      <Blob color="var(--sky-100)" w="180px" h="180px" style={{ top: "16%", right: "6%" }} />
      <div className="container hero-in">
        <div className="hero-copy">
          <div className="eyebrow">{h.eyebrow}</div>
          <h1>{h.titleA}<br />{h.titleB}<span className="hl">{h.titleHl}</span>{h.titleC}</h1>
          <p className="lead">{h.lead}</p>
          <div className="actions">
            <Button size="lg" icon="arrow-right" onClick={() => go("services")}>我想了解服務</Button>
            <Button variant="secondary" size="lg" onClick={() => go("news")}>加入會員</Button>
          </div>
        </div>
        <div className="embrace">
          <div className="embrace-ring r-outer float"></div>
          <div className="embrace-ring r-dash"></div>
          <div className="embrace-core"></div>
          <img src="assets/logo-transparent.png" alt="示範協會" className="embrace-logo float" />
          <span className="orbit o1"><Icon name="droplet" /></span>
          <span className="orbit o2"><Icon name="leaf" /></span>
          <span className="orbit o3"><Icon name="heart" /></span>
          <span className="orbit o4"><Icon name="sparkles" /></span>
        </div>
      </div>
    </section>
  );
}

function Entries({ go }) {
  return (
    <section className="section">
      <div className="container">
        <Reveal>
          <div className="sec-head">
            <div className="kick">How can we help</div>
            <h2>您想做什麼？</h2>
            <p>一進網站就能找到方向，我們陪您一步步往前走。</p>
          </div>
        </Reveal>
        <Reveal>
          <div className="entries">
            {ENTRIES.map((e, i) => (
              <div className="entry" key={i} onClick={() => go(e.id)}>
                <IconTile name={e.icon} bg={e.bg} color={e.color} />
                <h3>{e.label}</h3>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function AboutTeaser({ go }) {
  const a = useStore().site.about;
  return (
    <section className="section soft">
      <div className="container teaser-grid">
        <Reveal>
          <div className="embrace sm">
            <div className="embrace-core" style={{ background: "radial-gradient(circle at 40% 35%, #fff, var(--mint-100))" }}></div>
            <img src="assets/logo-transparent.png" alt="" className="embrace-logo" />
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div>
            <div className="kick teaser-kick">About 本會</div>
            <h2 className="teaser-h2">把重心，回到善待助人者本身</h2>
            <p className="teaser-lead">{a.origin1}</p>
            <p className="teaser-muted">{a.origin2}</p>
            <Button variant="ghost" icon="arrow-right" onClick={() => go("about")}>認識我們的故事</Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function QuoteBand() {
  const q = useStore().site.about.quote;
  return (
    <section className="qband">
      <div className="container qin">
        <p className="q">「{q}」</p>
        <div className="by">— 示範・命名緣起</div>
      </div>
    </section>
  );
}

function NewsCard({ n, onClick }) {
  const st = newsStyle(n.category);
  return (
    <div className="ncard" onClick={onClick}>
      <div className="ph" style={{ background: st.bg }}>
        <span className="icon-deco"><Icon name={n.icon} style={{ color: st.c }} /></span>
        <span className="ph-tag">{n.category}</span>
      </div>
      <div className="body">
        <div className="date">{fmtDate(n.date)}</div>
        <h3>{n.title}</h3>
        <p>{n.excerpt}</p>
      </div>
    </div>
  );
}

function NewsPreview({ go }) {
  const news = useStore().news.filter((n) => n.published).slice(0, 3);
  return (
    <section className="section">
      <div className="container">
        <Reveal>
          <div className="sec-head">
            <div className="kick">Latest news</div>
            <h2>最新消息</h2>
            <p>協會的近期動態、活動與招募資訊。</p>
          </div>
        </Reveal>
        <Reveal>
          <div className="news-grid">
            {news.map((n) => <NewsCard key={n.id} n={n} onClick={() => go("news")} />)}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CTABand({ go }) {
  return (
    <section className="cta-band">
      <div className="container cta-in">
        <Reveal>
          <h2>成為善的起點，一同向光而行</h2>
          <p>現正熱烈招募新會員 · 籌備期間首年免費</p>
          <Button size="lg" icon="heart" onClick={() => go("news")}>立即加入會員</Button>
        </Reveal>
      </div>
    </section>
  );
}

function Home({ go }) {
  return (
    <main>
      <Hero go={go} />
      <Entries go={go} />
      <AboutTeaser go={go} />
      <QuoteBand />
      <NewsPreview go={go} />
      <CTABand go={go} />
    </main>
  );
}

Object.assign(window, { Home, NewsCard, QuoteBand, CTABand });
