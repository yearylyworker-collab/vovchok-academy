/* Онбординг-воронка: язык → условия (подписка на канал) → анимированная проверка → награда → академия.
   Реальная проверка подписки возможна через VA.CFG.checkUrl (эндпоинт бота, getChatMember); без него — анимированная сверка. */
(() => {
  const VA = window.VA;
  const q = new URLSearchParams(location.search);
  const hasUid = !!localStorage.getItem("va_uid");
  if (hasUid && q.get("reset") !== "1" && !(location.hash || "").startsWith("#s")) return;
  document.body.classList.add("funnel-on");
  const root = document.createElement("div");
  root.id = "story"; root.setAttribute("data-testid", "onboarding");
  document.body.appendChild(root);
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(() => { if (root.isConnected) fn(); }, ms));
  const clearTimers = () => { timers.splice(0).forEach(clearTimeout); };
  const LANG_BTNS = () => VA.LANGS.map((l) => `<button type="button" class="flag${l === VA.lang() ? " on" : ""}" data-l="${l}" data-testid="onboarding-lang-${l}">${{ ru: "🇷🇺 Русский", uk: "🇺🇦 Українська", ar: "🇸🇦 العربية" }[l]}</button>`).join("");
  const TILES = [["learn", "st_tile1", "up"], ["spark", "st_tile2", "up_pullback"], ["practice", "st_tile3", "down_bounce"], ["profile", "st_tile4", "breakout_up"]];

  function steps() {
    const t = VA.t;
    return [
      /* 0 — вход */
      { k: "st_enter", talk: t("st_enter_talk"), mood: "welcome",
        body: `<div class="kicker">${t("st_lang")}</div><div class="flags" id="stLangs">${LANG_BTNS()}</div><a class="btn btn-primary glow" data-testid="onboarding-start-button" href="#s1">${t("st_start")}</a>${VA.disclaimer(true)}` },
      /* 1 — условия */
      { k: "st_cond", talk: t("st_cond_talk"), mood: "think",
        body: `<div class="cond hide" id="cond" data-testid="onboarding-conditions">
          <div class="kicker">${t("st_cond_title")}</div>
          <div class="cond-item" data-testid="onboarding-condition-item"><span class="cico">${VA.icon("channel")}</span><b>${t("st_cond_item")}</b><i class="tick" id="condTick"></i></div>
          <a class="btn btn-primary glow shimmer" id="stSub" data-testid="onboarding-subscribe-button" href="${VA.CFG.channel}" target="_blank" rel="noopener">${t("st_subscribe")}</a>
          <a class="btn btn-ghost glow-soft" id="stVerify" data-testid="onboarding-verify-button" href="#s2">${t("st_verify")}</a>
        </div>` },
      /* 2 — проверка */
      { k: "st_check", talk: t("st_check_talk"), mood: "watch",
        body: `<div class="ring-box" data-testid="onboarding-check"><i class="orbit"></i><i class="orbit o2"></i><div class="ring"><span id="stPct" data-testid="onboarding-check-percent">0%</span></div></div>
          <ul class="checks" id="checks" data-testid="onboarding-checklist">${[1, 2, 3, 4].map((i) => `<li data-testid="onboarding-check-${i}"><i class="tick"></i><span>${t("st_chk" + i)}</span></li>`).join("")}</ul>` },
      /* 3 — награда */
      { k: "st_open", talk: t("st_open_talk"), mood: "correct",
        body: `<div class="reward" data-testid="onboarding-reward"><div class="confetti" id="confetti"></div>
          <div class="kicker">${t("st_reward")}</div><h2 class="h2">VOVCHOK ACADEMY</h2><p class="sub">${t("st_reward_sub")}</p>
          <div class="tiles" data-testid="onboarding-showcase">${TILES.map(([ic, key, p]) => `<div class="tile" data-p="${p}"><div class="live mini"><canvas class="scene"></canvas></div><span class="tico">${VA.icon(ic)}</span><b>${t(key)}</b></div>`).join("")}</div>
          </div><a class="btn btn-ok glow" data-testid="onboarding-enter-button" href="#home" id="stGo">${t("st_go")}</a>` }
    ];
  }
  function stepFromHash() {
    const n = parseInt(String(location.hash || "#s0").replace("#s", ""), 10);
    return isNaN(n) ? 0 : Math.max(0, Math.min(3, n));
  }
  function draw() {
    if (!root.isConnected) return;
    const h = location.hash || "";
    if (h && !h.startsWith("#s")) return;
    clearTimers();
    const step = stepFromHash(), s = steps()[step];
    const dots = `<div class="stepdots" data-testid="onboarding-steps">${[0, 1, 2, 3].map((k) => `<i class="${k === step ? "on" : k < step ? "done" : ""}"></i>`).join("")}</div>`;
    root.innerHTML = `<div class="sheet"><div class="toprow"><div class="brand">VOVCHOK ACADEMY<small>${VA.t("brand_sub")}</small></div><span class="beta">BETA</span></div>${dots}${window.VALogo ? VALogo(VA.t(s.k)) : ""}${VA.talk(s.talk, s.mood, "onboarding-bubble")}${s.body}</div>`;
    root.scrollTop = 0;
    VA.type(root);
    root.querySelectorAll("#stLangs .flag").forEach((b) => (b.onclick = () => { VA.setLang(b.dataset.l); draw(); }));

    if (step === 1) {
      /* через пару секунд — вторая реплика и условия, автоскролл к кнопке */
      later(() => {
        const bub = root.querySelector(".bubble"); if (bub) { bub.setAttribute("data-type", VA.t("st_cond_talk2")); VA.type(root); }
        const ava = root.querySelector(".ava"); if (window.VASetMood) VASetMood(ava, "watch");
        const c = root.querySelector("#cond"); if (c) c.classList.remove("hide");
        later(() => { const b = root.querySelector("#stSub"); if (b) b.scrollIntoView({ behavior: "smooth", block: "center" }); }, 350);
      }, 2400);
      const sub = root.querySelector("#stSub");
      if (sub) sub.addEventListener("click", () => { localStorage.setItem("va_sub_clicked", "1"); const tk = root.querySelector("#condTick"); if (tk) tk.classList.add("on"); });
    }
    if (step === 2) runCheck();
    if (step === 3) {
      root.querySelectorAll(".tile").forEach((tile, i) => { VAChart.mount(tile, { p: tile.dataset.p, seed: "reward" + i, n: 18 }); });
      confetti(root.querySelector("#confetti"));
      const go = root.querySelector("#stGo");
      if (go) go.addEventListener("click", () => { if (!localStorage.getItem("va_uid")) localStorage.setItem("va_uid", "tg"); });
    }
  }
  /* Проверка: шкала 0→100%, пункты чеклиста отмечаются по очереди, затем награда. */
  function runCheck() {
    const items = Array.from(root.querySelectorAll("#checks li"));
    let n = 0;
    const iv = setInterval(() => {
      if (!root.isConnected || stepFromHash() !== 2) { clearInterval(iv); return; }
      n = Math.min(100, n + 2);
      const p = root.querySelector("#stPct"); if (p) p.textContent = n + "%";
      const r = root.querySelector(".ring"); if (r) r.style.setProperty("--p", n + "%");
      items.forEach((li, i) => { if (n >= (i + 1) * 25 - 2) li.classList.add("on"); });
      if (n >= 100) {
        clearInterval(iv);
        const ava = root.querySelector(".ava"); if (window.VASetMood) VASetMood(ava, "correct");
        VA.haptic("success");
        localStorage.setItem("va_uid", localStorage.getItem("va_uid") || "tg");
        later(() => { location.hash = "#s3"; }, 700);
      }
    }, 55);
    timers.push(iv);
  }
  function confetti(box) {
    if (!box || document.documentElement.classList.contains("lite")) return;
    const cols = ["#3ce7ff", "#7dffc3", "#ffd56a", "#ff9f43", "#6d7bff", "#ffffff"];
    box.innerHTML = Array.from({ length: 28 }, (_, i) => `<i style="left:${(i * 37) % 100}%;background:${cols[i % cols.length]};animation-delay:${(i % 7) * 0.18}s;animation-duration:${2.4 + (i % 5) * 0.35}s;transform:rotate(${i * 23}deg)"></i>`).join("");
  }
  window.addEventListener("hashchange", draw);
  if (!location.hash || !location.hash.startsWith("#s")) history.replaceState(null, "", location.pathname + location.search + "#s0");
  draw();
})();
