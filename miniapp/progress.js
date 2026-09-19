/* VOVCHOK ACADEMY — прогресс (localStorage). Один объект va_progress. */
(() => {
  const KEY = "va_progress";
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  function save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} }
  const P = { done: {}, practice: {}, last: null, ...load() };
  P.done = P.done || {}; P.practice = P.practice || {};

  function all() {
    const L = window.VA_LESSONS || {}, out = [];
    for (let m = 1; m <= 12; m++) (L["m" + m] || []).forEach((ls, i) => out.push({ m, i, ls }));
    return out;
  }
  window.VAProgress = {
    isDone: (id) => !!P.done[id],
    markDone(id) { if (!P.done[id]) { P.done[id] = Date.now(); save(P); return true; } return false; },
    setPractice(id, ok) { P.practice[id] = { ok: !!ok, at: Date.now() }; if (ok) P.done[id] = P.done[id] || Date.now(); save(P); },
    practice: (id) => P.practice[id] || null,
    setLast(m, i) { P.last = { m, i }; save(P); },
    last: () => P.last,
    moduleStats(m) {
      const items = (window.VA_LESSONS || {})["m" + m] || [];
      const done = items.filter((ls) => P.done[ls.id]).length;
      return { n: items.length, done, complete: items.length > 0 && done === items.length };
    },
    stats() {
      const items = all();
      const done = items.filter((x) => P.done[x.ls.id]).length;
      const pr = items.filter((x) => x.ls.type === "practice");
      const prOk = pr.filter((x) => P.practice[x.ls.id] && P.practice[x.ls.id].ok).length;
      return { total: items.length, done, pct: items.length ? Math.round((done / items.length) * 100) : 0, practices: pr.length, practicesOk: prOk };
    },
    /* Следующий непройденный урок начиная с последнего места. */
    next() {
      const items = all(); if (!items.length) return null;
      let start = 0;
      if (P.last) { const idx = items.findIndex((x) => x.m === P.last.m && x.i === P.last.i); if (idx >= 0) start = idx; }
      for (let k = 0; k < items.length; k++) { const x = items[(start + k) % items.length]; if (!P.done[x.ls.id]) return x; }
      return null;
    },
    reset() { P.done = {}; P.practice = {}; P.last = null; save(P); },
    all
  };
})();
