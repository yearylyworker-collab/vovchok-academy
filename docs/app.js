/* VOVCHOK ACADEMY — ядро: язык, RTL, i18n, оболочка экранов. */
(() => {
  const LANGS = ["ru", "uk", "ar"];
  /* API наставника: window.VA_API_URL (index.html) для GitHub Pages; в превью — тот же origin */
  const API = window.VA_API_URL || (location.pathname.indexOf("/api/miniapp") === 0 ? location.origin + "/api" : "");
  const CFG = { api: API, partner: "https://comfortrade.com/ru?pid=n2y7nshp", dm: "https://t.me/Vovchokvtrade", channel: "https://t.me/+LbZDg2Te0XE0OGJh" };
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
    /* Вибро-отклик через Telegram HapticFeedback (fallback — navigator.vibrate). kind: success | error | warning | light */
    haptic(kind) {
      try {
        const H = window.Telegram && Telegram.WebApp && Telegram.WebApp.HapticFeedback;
        if (H) { if (kind === "light" || kind === "medium") H.impactOccurred(kind); else H.notificationOccurred(kind); return; }
        if (navigator.vibrate) navigator.vibrate(kind === "error" ? [40, 60, 40] : kind === "success" ? [25, 40, 25] : 15);
      } catch (e) {}
    },
    /* Запрос к Волчку-наставнику (Claude). Возвращает текст или бросает ошибку. */
    async mentor(path, body) {
      const r = await fetch(CFG.api + "/mentor/" + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang: VA.lang(), ...body }) });
      if (!r.ok) throw new Error("mentor " + r.status);
      return (await r.json()).answer;
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

  function paintHome() { if (window.VAOpenHome) VAOpenHome(); }

  window.VAOpenCommunity = function () {
    const el = VA.box("community"); if (!el) return;
    const big = (cls, icon, kicker, title, desc, href, cta, tid) => `<div class="bigcard ${cls}" data-testid="${tid}-card"><a class="bhead" href="${href}" target="_blank" rel="noopener" data-testid="${tid}-head"><span class="bico">${icon}</span><div><small>${kicker}</small><b>${title}</b><p>${desc}</p></div><span class="st">›</span></a><a class="btn btn-primary glow" data-testid="${tid}-link" href="${href}" target="_blank" rel="noopener">${cta}</a></div>`;
    const tg = `<svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M21.5 4.5 3 11l7 2.5L12.5 21l9-16.5z"/></svg>`;
    const ct = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6-5 6 5 6"/><path d="m15 6 5 6-5 6"/></svg>`;
    el.innerHTML = VA.frame(`<div class="hero-b hero-c"><div class="hart"><i class="mtn"></i><i class="mtn m2"></i><i class="hmoon"></i>${VAWolf("welcome").replace('class="ava', 'class="ava hero-wolf')}</div><h1 class="h1" data-testid="hero-title">${VA.t("community")}</h1><p class="hero-sub accent">${VA.t("community_hero")}</p><p class="hero-sub">${VA.t("community_hero_sub")}</p><span class="tag script">${VA.t("community_tag")}</span></div>` +
      VA.talk(VA.t("community_talk"), "welcome", "community-wolf-bubble") +
      big("c-tg", tg, VA.t("official_channel"), "VOVCHOK ACADEMY", VA.t("channel_desc"), CFG.channel, VA.t("go_channel"), "community-channel") +
      big("c-ct", ct, VA.t("our_partner"), "ComfortTrade", VA.t("partner_desc"), CFG.partner, VA.t("go_partner"), "community-partner") +
      `<div class="banner" data-testid="community-banner"><i class="mtn"></i><i class="mtn m2"></i><i class="hmoon"></i>${VAWolf("calm").replace('class="ava', 'class="ava banner-wolf')}<p>«${VA.t("community_quote")}»</p><span class="script">Vovchok</span></div>${VA.disclaimer(true)}`);
    VA.type(el);
  };
  /* События прогресса: +XP, достижения, новый уровень */
  window.VAOnProgress = function (e) {
    if (e.type === "xp") { const f = document.createElement("div"); f.className = "xpfloat"; f.setAttribute("data-testid", "xp-float"); f.textContent = VA.t("xp_gain", { n: e.n }); f.style.top = (38 + document.querySelectorAll(".xpfloat").length * 7) + "%"; document.body.appendChild(f); setTimeout(() => f.remove(), 1500); const v = document.getElementById("xpVal"); if (v) v.textContent = VAProgress.xp().toLocaleString("ru-RU"); }
    if (e.type === "ach") { setTimeout(() => { VA.toast("🏆 " + VA.t("ach_unlock_toast", { name: VA.t("ach_" + e.id) })); VA.haptic("success"); const h = document.querySelector(`[data-testid="ach-${e.id}"]`); if (h) h.classList.add("on", "unlock"); }, 600); }
    if (e.type === "level") setTimeout(() => { VA.toast("⭐ " + VA.t("level_up") + " " + VA.t("level_n", { n: e.n })); VA.haptic("success"); }, 1200);
  };
})();
