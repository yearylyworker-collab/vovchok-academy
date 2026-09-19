/* Онбординг-воронка: язык → состав → доступ → проверка → скан → вход. Полностью локализована, язык применяется сразу. */
(() => {
  const VA = window.VA;
  const q = new URLSearchParams(location.search);
  const hasUid = !!localStorage.getItem("va_uid");
  if (hasUid && q.get("reset") !== "1" && !(location.hash || "").startsWith("#s")) return;
  document.body.classList.add("funnel-on");
  const root = document.createElement("div");
  root.id = "story"; root.setAttribute("data-testid", "onboarding");
  document.body.appendChild(root);
  const LANG_BTNS = () => VA.LANGS.map((l) => `<button type="button" class="flag${l === VA.lang() ? " on" : ""}" data-l="${l}" data-testid="onboarding-lang-${l}">${{ ru: "🇷🇺 Русский", uk: "🇺🇦 Українська", ar: "🇸🇦 العربية" }[l]}</button>`).join("");
  function steps() {
    const t = VA.t;
    return [
      ["st_enter", t("st_enter_talk"), `<div class="kicker">${t("st_lang")}</div><div class="flags" id="stLangs">${LANG_BTNS()}</div><a class="btn btn-primary" data-testid="onboarding-start-button" href="#s1">${t("st_start")}</a>${VA.disclaimer(true)}`, "welcome"],
      ["st_about", t("st_about_talk", { call: VA.label("call"), put: VA.label("put"), wait: VA.label("wait") }), `<a class="btn btn-primary" data-testid="onboarding-about-next" href="#s2">${t("st_ok")}</a>`, "calm"],
      ["st_access", t("st_access_talk"), `<a class="btn btn-primary" data-testid="onboarding-register-link" href="${VA.CFG.partner}" target="_blank" rel="noopener">${t("st_register")}</a><a class="btn btn-ghost" data-testid="onboarding-have-account" href="#s3">${t("st_have")}</a>`, "calm"],
      ["st_check", t("st_check_talk"), `<input class="input" id="stUid" data-testid="onboarding-uid-input" placeholder="demo" inputmode="numeric"><a class="btn btn-primary" data-testid="onboarding-check-button" href="#s4" id="stChk">${t("st_check_btn")}</a>`, "think"],
      ["st_scan", t("st_scan_talk"), `<div class="ring-box"><i class="orbit"></i><div class="ring"><span id="stPct">0%</span></div></div>`, "think"],
      ["st_open", t("st_open_talk"), `<a class="btn btn-ok" data-testid="onboarding-enter-button" href="#home" id="stGo">${t("st_go")}</a>`, "correct"]
    ];
  }
  function stepFromHash() {
    const n = parseInt(String(location.hash || "#s0").replace("#s", ""), 10);
    return isNaN(n) ? 0 : Math.max(0, Math.min(5, n));
  }
  function draw() {
    if (!root.isConnected) return;
    const h = location.hash || "";
    if (h && !h.startsWith("#s")) return;
    const step = stepFromHash(), s = steps()[step];
    const dots = `<div class="stepdots" data-testid="onboarding-steps">${[0,1,2,3,4,5].map((k) => `<i class="${k === step ? "on" : k < step ? "done" : ""}"></i>`).join("")}</div>`;
    root.innerHTML = `<div class="sheet"><div class="toprow"><div class="brand">VOVCHOK ACADEMY<small>${VA.t("brand_sub")}</small></div><span class="beta">BETA</span></div>${dots}${window.VALogo ? VALogo(VA.t(s[0])) : ""}${VA.talk(s[1], s[3], "onboarding-bubble")}${s[2]}</div>`;
    VA.type(root);
    root.querySelectorAll("#stLangs .flag").forEach((b) => (b.onclick = () => { VA.setLang(b.dataset.l); draw(); }));
    const chk = root.querySelector("#stChk");
    if (chk) chk.addEventListener("click", () => { const inp = root.querySelector("#stUid"); localStorage.setItem("va_uid", ((inp && inp.value) || "demo").trim() || "demo"); });
    const go = root.querySelector("#stGo");
    if (go) go.addEventListener("click", () => { if (!localStorage.getItem("va_uid")) localStorage.setItem("va_uid", "demo"); });
    if (step === 4) {
      let n = 0;
      const iv = setInterval(() => {
        n += 4; const p = root.querySelector("#stPct"); if (p) p.textContent = Math.min(100, n) + "%";
        const r = root.querySelector(".ring"); if (r) r.style.setProperty("--p", Math.min(100, n) + "%");
        if (n >= 100 || !root.isConnected) { clearInterval(iv); if (root.isConnected) location.hash = "#s5"; }
      }, 40);
    }
  }
  window.addEventListener("hashchange", draw);
  if (!location.hash || !location.hash.startsWith("#s")) history.replaceState(null, "", location.pathname + location.search + "#s0");
  draw();
})();
