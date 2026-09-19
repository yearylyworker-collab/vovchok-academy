/* Иконки навигации и карточек — inline SVG, наследуют currentColor. */
(() => {
  const s = (d, extra) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}${extra || ""}</svg>`;
  window.VA_ICONS = {
    home: s(`<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h5v-6h4v6h5V10"/>`),
    learn: s(`<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 18V5.5"/><path d="M9 8h7M9 12h5"/>`),
    practice: s(`<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/><path d="M12 3.5V1.5M20.5 12h2"/>`),
    community: s(`<circle cx="8.5" cy="9" r="3"/><circle cx="16.5" cy="9" r="3"/><path d="M2.5 19c.6-3.2 3-5 6-5s5.4 1.8 6 5"/><path d="M13.5 14.4c.9-.3 1.9-.4 3-.4 3 0 5.4 1.8 6 5"/>`),
    profile: s(`<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20c.8-3.8 3.8-6 7.5-6s6.7 2.2 7.5 6"/>`),
    channel: s(`<path d="M21.5 4.5 3 11l7 2.5L12.5 21l9-16.5z"/><path d="M10 13.5 21.5 4.5"/>`),
    dm: s(`<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>`),
    partner: s(`<path d="M3 17 9 11l4 4 8-8"/><path d="M15 7h6v6"/>`),
    rules: s(`<path d="M9 6h11M9 12h11M9 18h11"/><path d="m4 6 1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>`),
    spark: s(`<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>`),
    check: s(`<path d="m5 12.5 4.5 4.5L19 7.5"/>`),
    chev: s(`<path d="m9 6 6 6-6 6"/>`)
  };
  document.querySelectorAll("[data-icon]").forEach((el) => { el.innerHTML = window.VA_ICONS[el.getAttribute("data-icon")] || ""; });
})();
