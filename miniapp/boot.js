/* Загрузка: язык из ?lang=, Telegram WebApp, навигация по хэшу и тапам. Один обработчик вместо clicks/hash-nav/gate-off/home-fix. */
(() => {
  const VA = window.VA;
  const SCREENS = ["home", "learn", "practice", "community", "profile"];
  const q = new URLSearchParams(location.search);
  if (q.get("lang") && VA.LANGS.includes(q.get("lang")) && !localStorage.getItem("va_lang_user")) VA.setLang(q.get("lang"));
  VA.applyDir(); VA.paintNav();

  /* Пользовательский выбор языка имеет приоритет над ?lang= из бота. */
  const prevSet = VA.setLang;
  VA.setLang = function (l) { prevSet(l); try { localStorage.setItem("va_lang_user", "1"); } catch (e) {} };

  function tg() {
    try {
      const w = window.Telegram && Telegram.WebApp; if (!w) return;
      w.ready(); w.expand(); document.body.classList.add("in-tg");
      if (w.disableVerticalSwipes) w.disableVerticalSwipes();
      if (w.setHeaderColor) w.setHeaderColor("#030914");
      if (w.setBackgroundColor) w.setBackgroundColor("#01040c");
      const tgLang = w.initDataUnsafe && w.initDataUnsafe.user && w.initDataUnsafe.user.language_code;
      if (tgLang && !q.get("lang") && !localStorage.getItem("va_lang_user") && VA.LANGS.includes(tgLang)) { prevSet(tgLang); }
    } catch (e) {}
  }
  function fromHash() {
    const h = (location.hash || "").slice(1);
    if (SCREENS.includes(h)) { window.VAShow(h); return true; }
    return false;
  }
  /* Тапы: делегирование на document — надёжнее на iOS Telegram WebView, чем onclick на каждой ссылке. */
  document.addEventListener("click", (e) => {
    const a = e.target.closest(".nav a"); if (!a) return;
    e.preventDefault(); VA.haptic("light");
    const id = a.id.replace("n-", "");
    if (SCREENS.includes(id)) { history.replaceState(null, "", location.pathname + location.search + "#" + id); window.VAShow(id); }
  });
  window.addEventListener("hashchange", fromHash);
  tg();
  if (localStorage.getItem("va_uid") && !(location.hash || "").startsWith("#s") && q.get("reset") !== "1") { if (!fromHash()) window.VAShow("home"); }
})();
