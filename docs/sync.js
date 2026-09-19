/* Серверный прогресс: XP/серия/достижения синхронизируются с backend, чтобы не терялись при смене устройства. */
(() => {
  const VA = window.VA, P = window.VAProgress;
  const S = (window.VASync = { state: VA && VA.CFG.api ? "idle" : "local", at: 0, verified: false });
  if (!VA || !P || !VA.CFG.api) return;

  function uid() {
    let u = null;
    try { u = localStorage.getItem("va_sync_uid"); } catch (e) {}
    if (!u) { u = "web:" + Math.random().toString(36).slice(2) + Date.now().toString(36); try { localStorage.setItem("va_sync_uid", u); } catch (e) {} }
    return u;
  }
  const initData = () => { try { return (window.Telegram && Telegram.WebApp && Telegram.WebApp.initData) || ""; } catch (e) { return ""; } };
  function repaint() {
    const a = document.querySelector(".screen.active");
    if (a && window.VAShow) VAShow(a.id);
  }

  let busy = false, again = false, timer = null;
  async function push(restore) {
    if (busy) { again = true; return; }
    busy = true; S.state = "sync"; if (window.VASyncPaint) VASyncPaint();
    try {
      const r = await fetch(VA.CFG.api + "/progress/sync", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: uid(), init_data: initData(), lang: VA.lang(), state: P.exportState() })
      });
      if (!r.ok) throw new Error("sync " + r.status);
      const d = await r.json();
      S.verified = !!d.verified;
      const changed = P.importState(d.state);
      S.state = "ok"; S.at = Date.now();
      if (changed && restore) repaint();
    } catch (e) {
      S.state = "err";
    }
    busy = false;
    if (window.VASyncPaint) VASyncPaint();
    if (again) { again = false; schedule(); }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(() => push(false), 1500); }

  window.VASyncPush = schedule;
  window.VASyncNow = () => push(true);
  window.VASyncReset = async () => {
    clearTimeout(timer);
    try {
      await fetch(VA.CFG.api + "/progress/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid: uid(), init_data: initData(), lang: VA.lang() }) });
    } catch (e) {}
  };
  push(true);
  /* уходя в фон — отдаём последнее состояние */
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") push(false); });
})();
