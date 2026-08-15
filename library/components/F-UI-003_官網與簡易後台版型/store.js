/* White Dew — shared content store
   Single source of truth for editable site content.
   Persists to localStorage; both the public site (index.html) and the
   admin (admin.html) read/write here. Cross-tab sync via the 'storage' event,
   so editing in the admin updates an open public-site tab live. */
(function () {
  const KEY = "wd_site_content_v2";

  const uid = () => "n" + Math.random().toString(36).slice(2, 8);

  const DEFAULTS = {
    __v: 2,
    site: {
      hero: {
        eyebrow: "Taiwan White Dew · 社會福利服務協會",
        titleA: "讓需要支持的人，",
        titleB: "都能被",
        titleHl: "穩穩接住",
        titleC: "。",
        lead: "示範協會以「助人工作者的自我照顧」為願景出發，致力營造長期提供助人服務的友善環境，一同向光而行。",
      },
      about: {
        lead: "示範：初秋微涼，小小水珠逐步凝結，清晨而起也能見得遍布滋養大地。",
        intro: "114年2月本協會尚在籌組階段，待後續依法設立為非以營利為目的之公益性社會團體，以提升社工自我照顧與量能、為弱勢群體提供支援與關懷為宗旨。",
        origin1: "協會創立的契機，源自於與社工夥伴們一次次聚餐。我們在聚餐中凝聚共識，看見現行體制對實務工作者的磨難——自身的生活品質與身心健康總為了解決實務困境而讓步，社會工作者的自我犧牲似乎已成常態。",
        origin2: "我們因此迸發創建協會的想法，希望成為善的起點，將重心回到善待助人者本身。協會將致力於營造長期提供助人服務的友善環境，也期望使助人者在工作、生活、家庭、自我實現上尋得平衡，讓此成為善的循環。",
        quote: "初秋微涼，小小水珠逐步凝結，清晨而起也能見得遍布滋養大地。",
      },
      contact: {
        email: "contact@example.org",
        line: "@example-org · 掃描 QR 加好友",
        org: "非以營利為目的之公益性社會團體",
      },
      membershipNote: "114年2–3月籌備期間，會員首年免費！入會費 NT$500、年費 NT$500。",
      footerTagline: "以「助人工作者的自我照顧」為願景出發，致力營造長期提供助人服務的友善環境，一同向光而行。",
    },
    news: [
      { id: uid(), date: "2025-02-18", category: "會員招募", icon: "users-round", published: true,
        title: "誠摯邀請您加入協會大家庭！",
        excerpt: "現正熱烈招募新會員，籌備期間首年免費，與我們一同為社會福利盡一份心力。",
        body: "示範社會福利服務協會誠摯邀請您加入！我們是一個專注於社工照顧與弱勢關懷的非營利組織，期待與您一同為社會福利盡一份心力。現正熱烈招募新會員，籌備期間會員首年免費，歡迎個人、團體與贊助會員加入。" },
      { id: uid(), date: "2025-02-10", category: "協會公告", icon: "sprout", published: true,
        title: "示範社會福利服務協會正式籌組",
        excerpt: "以提升社工自我照顧與量能、為弱勢群體提供支援與關懷為宗旨，依法設立中。",
        body: "114年2月本協會尚在籌組階段，待後續依法設立為非以營利為目的之公益性社會團體。本會以提升社工自我照顧與量能、為弱勢群體提供支援與關懷為宗旨，將重心回到善待助人者本身。" },
      { id: uid(), date: "2025-03-05", category: "活動預告", icon: "wind", published: true,
        title: "身心放鬆・瑜珈冥想工作坊",
        excerpt: "為助人工作者打造的喘息空間，在忙碌之餘照顧自己的身心健康。",
        body: "本會將舉辦「身心放鬆・瑜珈冥想工作坊」，透過專業引導，為助人工作者打造一個喘息與自我照顧的空間。名額有限，敬請把握。" },
    ],
    members: [
      { id: uid(), name: "林佩築", type: "個人會員", date: "2025-02-20", status: "已繳費" },
      { id: uid(), name: "陳冠廷", type: "個人會員", date: "2025-02-22", status: "審查中" },
      { id: uid(), name: "晴光社福機構", type: "團體會員", date: "2025-02-25", status: "已繳費" },
      { id: uid(), name: "王思妤", type: "贊助會員", date: "2025-03-01", status: "已繳費" },
      { id: uid(), name: "張育誠", type: "個人會員", date: "2025-03-03", status: "審查中" },
    ],
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  let state = read();
  const subs = new Set();

  function read() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.__v === DEFAULTS.__v) return s;
    } catch (e) {}
    return clone(DEFAULTS);
  }
  function persist(notify = true) {
    localStorage.setItem(KEY, JSON.stringify(state));
    if (notify) subs.forEach((f) => f(state));
  }
  // cross-tab: another tab wrote -> reload + notify our subscribers
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) { state = read(); subs.forEach((f) => f(state)); }
  });

  window.WDStore = {
    get: () => state,
    getDefaults: () => clone(DEFAULTS),
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    // site text: update a section object with a patch
    updateSite(section, patch) { Object.assign(state.site[section], patch); persist(); },
    // site text: update top-level string fields (membershipNote, footerTagline)
    updateSiteRoot(patch) { Object.assign(state.site, patch); persist(); },
    // news CRUD
    addNews(item) {
      state.news.unshift({ id: uid(), icon: "megaphone", published: true, ...item });
      persist(); return state.news[0].id;
    },
    updateNews(id, patch) {
      const n = state.news.find((x) => x.id === id);
      if (n) Object.assign(n, patch);
      persist();
    },
    deleteNews(id) { state.news = state.news.filter((x) => x.id !== id); persist(); },
    // members
    updateMember(id, patch) {
      const m = state.members.find((x) => x.id === id); if (m) Object.assign(m, patch); persist();
    },
    deleteMember(id) { state.members = state.members.filter((x) => x.id !== id); persist(); },
    reset() { state = clone(DEFAULTS); persist(); },
    KEY,
  };
})();
