/* VOVCHOK ACADEMY — единое состояние ученика (localStorage va_progress): уроки, практика, XP, уровень, серия дней, достижения, темы. */
(() => {
  const KEY = "va_progress";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } };
  const P = Object.assign({ done: {}, practice: {}, history: [], xp: 0, xpLog: [], streak: 0, lastDay: null, days: 0, ach: {}, last: null, lastStep: 0 }, load());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} };
  const LEVELS = [0, 100, 300, 600, 1000];
  const today = () => new Date().toISOString().slice(0, 10);
  const events = []; /* очередь событий для UI: {type:"xp",n} | {type:"ach",id} | {type:"level",n} */
  const emit = (e) => { events.push(e); if (window.VAOnProgress) window.VAOnProgress(e); };

  function all() {
    const L = window.VA_LESSONS || {}, out = [];
    for (let m = 1; m <= 12; m++) (L["m" + m] || []).forEach((ls, i) => out.push({ m, i, ls }));
    return out;
  }
  const modStats = (m) => { const items = (window.VA_LESSONS || {})["m" + m] || []; const done = items.filter((ls) => P.done[ls.id]).length; return { n: items.length, done, complete: items.length > 0 && done === items.length }; };
  const level = (xp) => { const v = xp === undefined ? P.xp : xp; let n = 1; LEVELS.forEach((t, i) => { if (v >= t) n = i + 1; }); const next = LEVELS[n] || null; return { n, cur: LEVELS[n - 1], next, toNext: next ? next - v : 0, pct: next ? Math.round(((v - LEVELS[n - 1]) / (next - LEVELS[n - 1])) * 100) : 100 }; };
  function addXp(n, why) {
    if (!n) return;
    const before = level().n;
    P.xp += n; P.xpLog.push({ n, why, at: Date.now() }); if (P.xpLog.length > 200) P.xpLog.shift();
    emit({ type: "xp", n, why });
    if (level().n > before) emit({ type: "level", n: level().n });
  }
  function touchDay() {
    const t = today(); if (P.lastDay === t) return;
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    P.streak = P.lastDay === y ? P.streak + 1 : 1; P.lastDay = t; P.days += 1;
    if (P.streak > 1) addXp(5, "streak");
    save();
  }
  const ACH = [
    { id: "first_step", test: (s) => s.done >= 1, xp: 10 },
    { id: "five_lessons", test: (s) => s.done >= 5, xp: 15 },
    { id: "practitioner", test: (s) => s.answered >= 10, xp: 20 },
    { id: "sharp", test: (s) => s.answered >= 5 && s.accuracy >= 80, xp: 20 },
    { id: "streak3", test: () => P.streak >= 3, xp: 10 },
    { id: "streak7", test: () => P.streak >= 7, xp: 30 },
    { id: "candle_expert", test: () => modStats(2).complete, xp: 25 },
    { id: "final", test: (s) => s.total > 0 && s.done === s.total, xp: 100 }
  ];
  function checkAch() {
    const s = stats();
    ACH.forEach((a) => { if (!P.ach[a.id] && a.test(s)) { P.ach[a.id] = Date.now(); addXp(a.xp, "ach"); emit({ type: "ach", id: a.id }); } });
    save();
  }
  function stats() {
    const items = all(), done = items.filter((x) => P.done[x.ls.id]).length;
    let mods = 0; for (let m = 1; m <= 12; m++) if (modStats(m).complete) mods++;
    const answered = P.history.length, correct = P.history.filter((h) => h.ok).length;
    const pr = items.filter((x) => x.ls.type === "practice"), prOk = pr.filter((x) => P.practice[x.ls.id] && P.practice[x.ls.id].ok).length;
    return { total: items.length, done, pct: items.length ? Math.round((done / items.length) * 100) : 0, modules: mods, practices: pr.length, practicesOk: prOk,
      answered, correct, accuracy: answered ? Math.round((correct / answered) * 100) : 0, xp: P.xp, streak: P.streak, days: P.days, achievements: Object.keys(P.ach).length, achTotal: ACH.length };
  }
  window.VAProgress = {
    isDone: (id) => !!P.done[id],
    markDone(id) {
      if (P.done[id]) return false;
      P.done[id] = Date.now(); addXp(10, "lesson"); touchDay();
      const it = all().find((x) => x.ls.id === id); if (it && modStats(it.m).complete) addXp(20, "module");
      save(); checkAch(); return true;
    },
    /* ответ в практике: cat — категория темы; XP только за первое верное решение */
    setPractice(id, ok, cat) {
      const first = !(P.practice[id] && P.practice[id].ok);
      P.practice[id] = { ok: !!ok, at: Date.now() };
      P.history.push({ id, ok: !!ok, cat: cat || "context", at: Date.now() }); if (P.history.length > 500) P.history.shift();
      if (ok && first) { P.done[id] = P.done[id] || Date.now(); addXp(5, "practice"); }
      touchDay(); save(); checkAch();
    },
    practice: (id) => P.practice[id] || null,
    setLast(m, i, step) { P.last = { m, i }; P.lastStep = step || 0; save(); },
    last: () => P.last, lastStep: () => P.lastStep,
    moduleStats: modStats, stats, level, all,
    xp: () => P.xp, streak: () => P.streak, achievements: () => ACH.map((a) => ({ id: a.id, xp: a.xp, unlocked: !!P.ach[a.id] })),
    /* точность по темам: [{cat, n, ok, pct}] по возрастанию точности */
    topics() {
      const map = {};
      P.history.forEach((h) => { const t = (map[h.cat] = map[h.cat] || { cat: h.cat, n: 0, ok: 0 }); t.n++; if (h.ok) t.ok++; });
      return Object.values(map).map((t) => ({ ...t, pct: Math.round((t.ok / t.n) * 100) })).sort((a, b) => a.pct - b.pct);
    },
    next() {
      const items = all(); if (!items.length) return null;
      let start = 0;
      if (P.last) { const idx = items.findIndex((x) => x.m === P.last.m && x.i === P.last.i); if (idx >= 0) start = idx; }
      for (let k = 0; k < items.length; k++) { const x = items[(start + k) % items.length]; if (!P.done[x.ls.id]) return x; }
      return null;
    },
    events, touchDay,
    reset() { Object.assign(P, { done: {}, practice: {}, history: [], xp: 0, xpLog: [], streak: 0, lastDay: null, days: 0, ach: {}, last: null, lastStep: 0 }); save(); }
  };
})();
