/* VOVCHOK ACADEMY — ядро: язык, RTL, i18n, оболочка экранов. */
(() => {
  const LANGS = ["ru", "uk", "ar"];
  const CFG = { partner: "https://comfortrade.com/ru?pid=n2y7nshp", dm: "https://t.me/Vovchokvtrade", channel: "https://t.me/+LbZDg2Te0XE0OGJh" };
  const store = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const missing = (window.VA_MISSING = window.VA_MISSING || []);

  const VA = (window.VA = {
    CFG, LANGS,
    lang() { const l = store.get("va_lang", "ru"); return LANGS.includes(l) ? l : "ru"; },
    setLang(l) {
      if (!LANGS.includes(l)) return;
      store.set("va_lang", l);
      VA.applyDir();
      VA.paintNav();
    },
    isRTL() { return VA.lang() === "ar"; },
    applyDir() {
      const l = VA.lang();
      document.documentElement.lang = l;
      document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
      document.body.classList.toggle("rtl", l === "ar");
    },
    /* UI-строка по ключу с подстановкой {x}. Отсутствие ключа фиксируется, а не молча падает на ru. */
    t(key, vars) {
      const L = window.VA_I18N || {};
      const cur = L[VA.lang()] || {};
      let s = cur[key];
      if (s === undefined) { missing.push("ui:" + VA.lang() + ":" + key); s = (L.ru || {})[key]; }
      if (s === undefined) return key;
      if (vars) Object.keys(vars).forEach((k) => { s = s.split("{" + k + "}").join(String(vars[k])); });
      return s;
    },
    /* Локализованное поле контента {ru,uk,ar}. */
    txt(obj, id) {
      if (!obj) return "";
      if (typeof obj === "string") return obj;
      const l = VA.lang();
      let s = obj[l];
      if (!s) { missing.push("content:" + l + ":" + (id || "")); s = obj.ru || ""; }
      /* Плейсхолдеры меток решений → единые метки из trade-labels.js */
      return s.replace(/\{(call|put|wait)\}/g, (_, k) => VA.label(k));
    },
    label(kind, full) {
      const T = window.VA_TRADE_LABELS || {};
      const L = T[VA.lang()] || T.ru || {};
      return L[full ? kind + "_full" : kind] || kind.toUpperCase();
    },
    modName(m) { const arr = VA.t("modules"); return Array.isArray(arr) ? arr[m - 1] || "" : ""; },
    modIntro(m) { const arr = VA.t("modules_intro"); const s = Array.isArray(arr) ? arr[m - 1] || "" : ""; return s.replace(/\{(call|put|wait)\}/g, (_, k) => VA.label(k)); },
    icon(name) { return (window.VA_ICONS || {})[name] || ""; },
    esc(s) { return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); },
    frame(inner) { return `<div class="sheet"><div class="toprow"><div class="brand">VOVCHOK ACADEMY<small>${VA.t("brand_sub")}</small></div><span class="beta">BETA</span></div>${inner}</div>`; },
    talk(text, mood, id) {
      return `<div class="talk">${window.VAWolf ? VAWolf(mood || "calm") : ""}<div class="bubble" data-testid="${id || "wolf-bubble"}" data-type="${VA.esc(text)}">${text}</div></div>`;
    },
    disclaimer(short) {
      return `<details class="disc" data-testid="risk-disclaimer"${short ? "" : " open"}><summary>⚠️ ${VA.t("disclaimer_title")}</summary><p>${VA.t("disclaimer")}</p></details>`;
    },
    toast(msg) {
      const el = document.getElementById("toast"); if (!el) return;
      el.textContent = msg; el.classList.add("on");
      clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("on"), 1800);
    },
    /* Typing-анимация реплики проводника. */
    type(root) {
      const b = (root || document).querySelector(".bubble[data-type]"); if (!b) return;
      const full = b.getAttribute("data-type"); b.removeAttribute("data-type");
      if (document.documentElement.classList.contains("lite") || !full) { b.textContent = full; return; }
      const total = Math.min(1400, full.length * 14), stepMs = Math.max(8, total / full.length);
      let i = 0; b.textContent = ""; b.classList.add("typing");
      const iv = setInterval(() => {
        i += 1; b.textContent = full.slice(0, i);
        if (i >= full.length) { clearInterval(iv); b.classList.remove("typing"); }
      }, stepMs);
      b._iv = iv;
    },
    box(id) { return document.querySelector("#" + id + " .scroll"); },
    paintNav() {
      document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = VA.t(el.getAttribute("data-i18n")); });
    }
  });

  const ACADEMY = ["home", "learn", "lesson", "practice", "community", "profile"];
  function show(id) {
    document.querySelectorAll(".screen").forEach((el) => el.classList.toggle("active", el.id === id));
    const nav = document.getElementById("nav");
    if (nav) nav.classList.toggle("show", ACADEMY.includes(id));
    document.querySelectorAll(".nav a").forEach((b) => b.classList.toggle("on", b.id === "n-" + (id === "lesson" ? "learn" : id)));
    document.body.classList.add("phase-academy"); document.body.classList.remove("phase-funnel", "funnel-on");
    const st = document.getElementById("story"); if (st) st.remove();
    if (id === "home") paintHome();
    if (id === "learn" && window.VAOpenLearn) VAOpenLearn();
    if (id === "practice" && window.VAOpenPractice) VAOpenPractice();
    if (id === "community" && window.VAOpenCommunity) VAOpenCommunity();
    if (id === "profile" && window.VAOpenProfile) VAOpenProfile();
    if (window.VAUpgradeLogos) setTimeout(window.VAUpgradeLogos, 0);
    const sc = VA.box(id); if (sc) sc.scrollTop = 0;
  }
  window.VAShow = show;

  function paintHome() {
    const box = VA.box("home"); if (!box) return;
    const P = window.VAProgress, st = P ? P.stats() : { done: 0, total: 0, pct: 0 };
    const nx = P ? P.next() : null;
    const cta = nx && st.done > 0
      ? `<button class="btn btn-primary" id="homeContinue" data-testid="home-continue-button" type="button">${VA.t("continue_btn", { title: VA.txt(nx.ls.title, nx.ls.id) })}</button>`
      : `<button class="btn btn-primary" id="toLearn" data-testid="home-to-learn-button" type="button">${VA.t("to_learn")}</button>`;
    box.innerHTML = VA.frame(
      VA.talk(VA.t("home_talk"), st.pct === 100 ? "mastered" : st.done > 0 ? "calm" : "welcome", "home-wolf-bubble") +
      (window.VALogo ? VALogo(VA.t("nav_home")) : "") +
      `<h2 class="h2">${VA.t("slogan")}</h2>
       <p class="sub">${VA.t("home_sub")}</p>
       <div class="bar" data-testid="home-progress-bar"><i style="width:${st.pct}%"></i></div>
       <div class="muted" data-testid="home-progress-text">${VA.t("home_progress", st)}</div>
       ${cta}
       ${VA.disclaimer(true)}`
    );
    const c = box.querySelector("#homeContinue"); if (c) c.onclick = () => window.VAOpenLesson && VAOpenLesson(nx.m, nx.i);
    const l = box.querySelector("#toLearn"); if (l) l.onclick = () => show("learn");
    VA.type(box);
  }

  window.VAOpenCommunity = function () {
    const el = VA.box("community"); if (!el) return;
    const card = (cls, icon, title, desc, href, tid) => `<a class="card ${cls}" data-testid="${tid}" href="${href}" target="_blank" rel="noopener"><span class="cico">${VA.icon(icon)}</span><span><b>${title}</b><small>${desc}</small></span><span class="go">${VA.t("open_link")}${VA.icon("chev")}</span></a>`;
    el.innerHTML = VA.frame(VA.talk(VA.t("community_talk"), "welcome", "community-wolf-bubble") +
      `<div class="kicker">${VA.t("nav_community")}</div><h2 class="h2">${VA.t("community")}</h2><p class="sub">${VA.t("community_sub")}</p>
       <div class="cards" data-testid="community-cards">
         ${card("c-channel", "channel", VA.t("channel"), VA.t("community_channel_desc"), CFG.channel, "community-channel-link")}
         ${card("c-dm", "dm", VA.t("dm"), VA.t("community_dm_desc"), CFG.dm, "community-dm-link")}
         ${card("c-partner", "partner", VA.t("community_partner"), VA.t("community_partner_desc"), CFG.partner, "community-partner-link")}
       </div>
       <div class="rules" data-testid="community-rules"><b>${VA.icon("rules")}${VA.t("community_rules")}</b><ul><li>${VA.t("community_rule_1")}</li><li>${VA.t("community_rule_2")}</li><li>${VA.t("community_rule_3")}</li></ul></div>
       ${VA.disclaimer(true)}`);
    VA.type(el);
  };
})();
