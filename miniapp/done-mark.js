/* Отметка «пройдено» на карточках уроков/модулей — по реальному статусу VAProgress (класс .done ставит плеер). */
(() => {
  function mark() {
    document.querySelectorAll(".mod .st").forEach((el) => {
      const done = el.closest(".mod").classList.contains("done");
      const want = done ? "\u2713" : "\u203a";
      if (el.classList.contains("is-done") !== done) el.classList.toggle("is-done", done);
      if (el.textContent !== want) el.textContent = want;
    });
  }
  const root = document.getElementById("app") || document.body;
  new MutationObserver(mark).observe(root, { childList: true, subtree: true });
  mark();
})();
