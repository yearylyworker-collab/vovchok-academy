/* Проводник: SVG-волк с настроениями (mood). Мимика меняется классом .mood-*, глаза моргают, зрачки следят. */
(() => {
  const MARKUP = `<svg class="wolf-svg" viewBox="0 0 64 64" aria-hidden="true">
    <g class="ear-l"><path d="M14 28 L18 6 L28 22 Z"/><animateTransform attributeName="transform" type="rotate" values="0 20 24;-10 20 24;0 20 24" dur="3.2s" repeatCount="indefinite"/></g>
    <g class="ear-r"><path d="M50 28 L46 6 L36 22 Z"/><animateTransform attributeName="transform" type="rotate" values="0 44 24;8 44 24;0 44 24" dur="3.2s" begin="0.2s" repeatCount="indefinite"/></g>
    <path class="head" d="M18 24 C18 14 46 14 46 24 C48 36 44 44 32 50 C20 44 16 36 18 24 Z"/>
    <path class="muzzle" d="M24 40 C26 48 38 48 40 40 C38 46 26 46 24 40 Z"/>
    <g class="eyes">
      <ellipse class="eye-l" cx="24" cy="30" rx="3.2" ry="2.4"/>
      <ellipse class="eye-r" cx="40" cy="30" rx="3.2" ry="2.4"/>
      <g class="pupils"><circle class="pupil-l" cx="25" cy="30.4" r="1.15"/><circle class="pupil-r" cx="39" cy="30.4" r="1.15"/></g>
    </g>
    <path class="brow-l" d="M20 26 L28 25"/>
    <path class="brow-r" d="M44 26 L36 25"/>
    <path class="nose" d="M30 42 L32 40 L34 42 Z"/>
    <path class="mouth" d="__MOUTH__"/>
  </svg><i class="ava-ring"></i>`;
  /* Рот по настроению (JS, т.к. CSS d: path() не везде поддержан на iOS) */
  const MOUTH = { welcome: "M27 44 Q32 49 37 44", correct: "M26 44 Q32 50 38 44", mastered: "M26 44 Q32 50 38 44", warning: "M28 46 Q32 43 36 46", think: "M29 45 Q32 46 35 44", watch: "M28 45 L36 45" };
  const markup = (m) => MARKUP.replace("__MOUTH__", MOUTH[m] || "M28 45 Q32 47 36 45");
  window.VAWolf = function (mood) {
    const m = mood || "calm";
    return `<div class="ava mood-${m}" data-mood="${m}" data-testid="wolf-avatar">${markup(m)}</div>`;
  };
  window.VASetMood = function (el, mood) {
    if (!el) return;
    el.className = "ava mood-" + (mood || "calm") + " mood-switch";
    el.setAttribute("data-mood", mood || "calm");
    el.innerHTML = markup(mood || "calm");
    setTimeout(() => el.classList.remove("mood-switch"), 500);
  };
})();
