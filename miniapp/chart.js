/* VOVCHOK ACADEMY — детерминированные сценарные графики (кейс урока / сценарий практики). */
(() => {
  /* pts — опорные точки цены (0..100), zone — уровень зоны в тех же единицах, last — форма сигнальной свечи */
  const PATTERNS = {
    up:            { pts: [14, 30, 24, 44, 37, 58, 51, 72, 66, 80], zone: null },
    down:          { pts: [86, 70, 76, 56, 63, 42, 49, 28, 34, 20], zone: null },
    range:         { pts: [42, 60, 44, 58, 41, 61, 45, 57, 42, 59], zone: { lo: 40, hi: 62, kind: "range" } },
    chop:          { pts: [40, 58, 30, 55, 36, 62, 33, 50, 58, 38, 52, 44], zone: null, noise: 2.6 },
    up_pullback:   { pts: [14, 36, 28, 52, 45, 68, 60, 52, 51], zone: { lo: 48, hi: 54, kind: "support" }, last: "hammer" },
    down_bounce:   { pts: [86, 64, 72, 48, 55, 32, 40, 48, 49], zone: { lo: 46, hi: 52, kind: "resistance" }, last: "engulf_dn" },
    breakout_up:   { pts: [40, 56, 42, 58, 41, 57, 44, 66, 72, 62, 61], zone: { lo: 56, hi: 60, kind: "support" }, last: "up" },
    false_break:   { pts: [40, 56, 42, 58, 41, 57, 45, 55, 56], zone: { lo: 56, hi: 61, kind: "resistance" }, last: "pin_up" },
    doji_mid:      { pts: [40, 58, 42, 57, 44, 56, 49, 50], zone: { lo: 40, hi: 60, kind: "range" }, last: "doji" },
    engulf_top:    { pts: [18, 38, 32, 54, 47, 68, 62, 76, 75], zone: { lo: 73, hi: 79, kind: "resistance" }, last: "engulf_dn" },
    hammer_bottom: { pts: [82, 62, 68, 46, 53, 30, 36, 25, 26], zone: { lo: 22, hi: 28, kind: "support" }, last: "hammer" },
    reversal_down: { pts: [20, 40, 33, 55, 47, 70, 60, 44, 52, 53], zone: { lo: 50, hi: 56, kind: "resistance" }, last: "engulf_dn" },
    three_green:   { pts: [50, 56, 44, 58, 42, 55, 48, 52, 56, 58], zone: { lo: 40, hi: 60, kind: "range" }, last: "up" },
    ma_conflict:   { pts: [20, 40, 33, 55, 47, 70, 60, 44, 52, 53], zone: { lo: 50, hi: 56, kind: "resistance" }, last: "engulf_dn", ma: true }
  };
  function rng(seed) { let s = 0; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function build(spec) {
    const P = PATTERNS[spec.p] || PATTERNS.up;
    const r = rng(spec.seed || spec.p), n = spec.n || 26, noise = P.noise || 1.3;
    const closes = [];
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * (P.pts.length - 1), k = Math.floor(t), f = t - k;
      const a = P.pts[k], b = P.pts[Math.min(P.pts.length - 1, k + 1)];
      closes.push(a + (b - a) * f + (r() - 0.5) * noise * 2);
    }
    const c = [];
    for (let i = 0; i < n; i++) {
      const o = i ? c[i - 1].c : closes[0] - 1.5, cl = closes[i];
      c.push({ o, c: cl, h: Math.max(o, cl) + r() * 2.4, l: Math.min(o, cl) - r() * 2.4 });
    }
    const L = c[n - 1], prev = c[n - 2], body = Math.abs(prev.c - prev.o) || 3;
    switch (P.last) {
      case "hammer": L.o = prev.c; L.c = L.o + 1.2; L.l = L.o - 7; L.h = L.c + 0.6; break;
      case "engulf_dn": L.o = Math.max(prev.o, prev.c) + 0.8; L.c = Math.min(prev.o, prev.c) - 1.5; L.h = L.o + 0.7; L.l = L.c - 0.6; break;
      case "up": L.o = prev.c; L.c = L.o + Math.max(2.5, body); L.h = L.c + 0.6; L.l = L.o - 0.5; break;
      case "pin_up": L.o = prev.c; L.c = L.o - 0.8; L.h = L.o + 7; L.l = L.c - 0.5; break;
      case "doji": L.o = prev.c; L.c = L.o + 0.2; L.h = L.o + 2.6; L.l = L.o - 2.6; break;
    }
    return { candles: c, zone: P.zone, ma: !!P.ma };
  }
  function draw(cv, spec) {
    if (!cv) return;
    const box = cv.parentElement || cv, rect = box.getBoundingClientRect();
    const w = Math.max(60, Math.round(rect.width || 300)) - 16, h = Math.max(80, Math.round(rect.height || 168)) - 16;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.width = w + "px"; cv.style.height = h + "px"; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const rtl = false; /* ось времени всегда слева направо */
    const built = build(spec), zone = built.zone, ma = built.ma;
    const total = built.candles.length, shown = Math.max(2, Math.min(total, spec.count || total));
    const candles = built.candles.slice(0, shown);
    const n = total, pad = 6, axisW = spec.axis ? 34 : 0;
    let lo = Infinity, hi = -Infinity;
    candles.forEach((c) => { lo = Math.min(lo, c.l); hi = Math.max(hi, c.h); });
    if (zone) { lo = Math.min(lo, zone.lo); hi = Math.max(hi, zone.hi); }
    lo -= 3; hi += 3;
    const y = (v) => h - pad - ((v - lo) / (hi - lo)) * (h - pad * 2);
    const slot = (w - 12 - axisW) / (n + 1), bw = Math.max(3.5, slot * 0.62);
    const xAt = (i) => { const x = 8 + i * slot; return rtl ? w - x - bw : x; };
    if (spec.axis) {
      g.fillStyle = "rgba(160,200,230,.55)"; g.font = "600 9px system-ui,sans-serif"; g.textAlign = "left";
      const base = 1.09, step = (hi - lo) / 4;
      for (let k = 0; k <= 4; k++) { const v = lo + step * k; g.fillText((base + v / 4000).toFixed(4), w - axisW + 4, y(v) + 3); }
      g.strokeStyle = "rgba(60,231,255,.12)"; g.beginPath(); g.moveTo(w - axisW, 0); g.lineTo(w - axisW, h); g.stroke();
    }
    g.strokeStyle = "rgba(60,231,255,.07)"; g.lineWidth = 1;
    for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(0, (h / 5) * k); g.lineTo(w, (h / 5) * k); g.stroke(); }
    if (spec.axis) { g.fillStyle = "rgba(160,200,230,.45)"; g.font = "600 9px system-ui,sans-serif"; g.textAlign = "center"; ["12:00", "18:00", "00:00", "06:00"].forEach((t, k) => g.fillText(t, ((w - axisW) / 4) * k + (w - axisW) / 8, h - 2)); }
    if (zone) {
      g.fillStyle = zone.kind === "support" ? "rgba(52,211,153,.14)" : zone.kind === "resistance" ? "rgba(251,113,133,.14)" : "rgba(60,231,255,.10)";
      const zw = w - axisW;
      if (zone.kind === "range") { g.fillRect(0, y(zone.hi) - 3, zw, 6); g.fillRect(0, y(zone.lo) - 3, zw, 6); }
      else g.fillRect(0, y(zone.hi), zw, Math.max(4, y(zone.lo) - y(zone.hi)));
      if (spec.axis && window.VA) {
        g.fillStyle = zone.kind === "support" ? "rgba(52,211,153,.9)" : zone.kind === "resistance" ? "rgba(251,113,133,.9)" : "rgba(120,225,255,.9)";
        g.font = "700 10px system-ui,sans-serif"; g.textAlign = "left";
        g.fillText(VA.t("chart_zone_" + zone.kind), 6, (zone.kind === "support" ? y(zone.lo) + 12 : y(zone.hi) - 5));
      }
    }
    if (ma) {
      g.strokeStyle = "rgba(255,213,106,.85)"; g.lineWidth = 1.6; g.beginPath();
      for (let i = 4; i < n; i++) { let s = 0; for (let k = i - 4; k <= i; k++) s += candles[k].c; const v = s / 5; const x = xAt(i) + bw / 2; i === 4 ? g.moveTo(x, y(v)) : g.lineTo(x, y(v)); }
      g.stroke();
    }
    candles.forEach((c, i) => {
      const x = xAt(i), up = c.c >= c.o, lastOne = i === shown - 1;
      const col = up ? "#34d399" : "#fb7185";
      g.strokeStyle = col; g.fillStyle = col; g.lineWidth = lastOne ? 1.8 : 1.15;
      g.beginPath(); g.moveTo(x + bw / 2, y(c.h)); g.lineTo(x + bw / 2, y(c.l)); g.stroke();
      const top = y(Math.max(c.o, c.c)), bot = y(Math.min(c.o, c.c));
      g.fillRect(x, top, bw, Math.max(2, bot - top));
      if (lastOne) { g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 1; g.strokeRect(x - 2.5, y(c.h) - 3, bw + 5, y(c.l) - y(c.h) + 6); }
    });
    if (spec.question && shown === total) {
      const x = rtl ? 10 : w - 24;
      g.fillStyle = "rgba(60,231,255,.9)"; g.font = "800 15px system-ui,sans-serif"; g.textAlign = "left"; g.fillText("?", x - axisW, y(candles[shown - 1].c) - 10);
    }
  }
  function legend(spec) {
    const P = PATTERNS[spec.p] || PATTERNS.up, T = window.VA;
    const items = [];
    if (P.zone) items.push(`<i class="lg lg-${P.zone.kind}"></i>${T.t("chart_zone_" + P.zone.kind)}`);
    if (P.ma) items.push(`<i class="lg lg-ma"></i>${T.t("chart_ma")}`);
    return items.length ? `<div class="legend" data-testid="chart-legend">${items.map((s) => `<span>${s}</span>`).join("")}</div>` : "";
  }
  window.VAChart = {
    html(spec) {
      const T = window.VA;
      return `<div class="ticker" data-testid="chart-ticker"><span>${T.t("chart_label")}</span><b>${T.t("chart_case")}</b></div><div class="live"><canvas class="scene" data-testid="scenario-chart"></canvas></div>${legend(spec)}`;
    },
    mount(root, spec) {
      const cv = (root || document).querySelector("canvas.scene"); if (!cv) return;
      const paint = () => draw(cv, cv._spec || spec);
      cv._spec = spec;
      requestAnimationFrame(paint);
      if (!cv._ro && window.ResizeObserver) { cv._ro = new ResizeObserver(paint); cv._ro.observe(cv.parentElement); }
    },
    /* Replay: свечи появляются по одной. Возвращает контроллер {play,pause,replay,playing}. */
    replay(root, spec, onDone) {
      const cv = (root || document).querySelector("canvas.scene"); if (!cv) return null;
      const total = spec.n || 26; let count = 3, timer = 0;
      const ctl = { playing: false,
        step() { count = Math.min(total, count + 1); cv._spec = { ...spec, count }; draw(cv, cv._spec); if (count >= total) { ctl.pause(); onDone && onDone(); } },
        play() { if (ctl.playing || count >= total) return; ctl.playing = true; timer = setInterval(ctl.step, 90); },
        pause() { ctl.playing = false; clearInterval(timer); },
        replay() { ctl.pause(); count = 3; cv._spec = { ...spec, count }; draw(cv, cv._spec); ctl.play(); },
        finish() { ctl.pause(); count = total; cv._spec = { ...spec, count }; draw(cv, cv._spec); } };
      cv._spec = { ...spec, count }; requestAnimationFrame(() => draw(cv, cv._spec));
      if (!cv._ro && window.ResizeObserver) { cv._ro = new ResizeObserver(() => draw(cv, cv._spec)); cv._ro.observe(cv.parentElement); }
      if (document.documentElement.classList.contains("lite")) ctl.finish(); else ctl.play();
      return ctl;
    },
    patterns: Object.keys(PATTERNS)
  };
})();
