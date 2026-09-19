(() => {
  const weak =
    (navigator.hardwareConcurrency || 8) <= 2 ||
    (navigator.deviceMemory || 8) <= 2 ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (weak) document.documentElement.classList.add("lite");
  document.documentElement.classList.add("va-perf");
  document.addEventListener("visibilitychange", () => {
    document.documentElement.classList.toggle("va-hidden", document.hidden);
  });
  if (localStorage.getItem("va_uid")) document.body.classList.add("phase-academy");
})();
