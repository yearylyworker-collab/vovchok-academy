/* Живой фон: свечи + дрейфующие частицы. В академии тише (ниже альфа, реже кадры), но не замирает. Класс .lite → статичный кадр. */
(() => {
  const canvas = document.getElementById("fx");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  let candles = [], dots = [], t = 0, last = 0, bw = 0, bh = 0;
  const lite = () => document.documentElement.classList.contains("lite");
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.25);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); bw = w; bh = h;
  }
  function seed() {
    candles = []; let p = 28;
    for (let i = 0; i < 26; i++) {
      const o = p, c = Math.max(10, Math.min(48, o + Math.random() * 10 - 5));
      candles.push({ o, c, h: Math.max(o, c) + Math.random() * 6, l: Math.min(o, c) - Math.random() * 6 }); p = c;
    }
    dots = Array.from({ length: 34 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.6, v: 0.00025 + Math.random() * 0.0006, ph: Math.random() * Math.PI * 2 }));
  }
  function tick() {
    const L = candles[candles.length - 1];
    L.c = Math.max(8, Math.min(50, L.c + Math.random() * 4 - 2));
    L.h = Math.max(L.h, L.c, L.o); L.l = Math.min(L.l, L.c, L.o);
    if (t % 14 === 0) {
      const o = L.c, c = Math.max(8, Math.min(50, o + Math.random() * 8 - 4));
      candles.push({ o, c, h: Math.max(o, c) + 3, l: Math.min(o, c) - 3 });
      if (candles.length > 28) candles.shift();
    }
    dots.forEach((d) => { d.y -= d.v; d.x += Math.sin(t / 60 + d.ph) * 0.0004; if (d.y < -0.02) { d.y = 1.02; d.x = Math.random(); } });
  }
  function draw() {
    const w = bw, h = bh, quiet = document.body.classList.contains("phase-academy");
    ctx.clearRect(0, 0, w, h);
    /* частицы */
    dots.forEach((d) => {
      const a = (quiet ? 0.22 : 0.5) * (0.6 + 0.4 * Math.sin(t / 30 + d.ph));
      ctx.fillStyle = `rgba(120,225,255,${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(d.x * w, d.y * h, d.r, 0, Math.PI * 2); ctx.fill();
    });
    /* свечи у горизонта */
    const baseY = h * 0.93, slot = w / (candles.length + 2);
    ctx.globalAlpha = quiet ? 0.2 : 0.72; ctx.lineWidth = 1.2;
    candles.forEach((c, i) => {
      const x = slot * (i + 1), y = (v) => baseY - v * 2.2, up = c.c >= c.o;
      ctx.strokeStyle = up ? "rgba(61,255,154,.95)" : "rgba(255,120,140,.95)"; ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath(); ctx.moveTo(x, y(c.h)); ctx.lineTo(x, y(c.l)); ctx.stroke();
      const top = y(Math.max(c.o, c.c)), bot = y(Math.min(c.o, c.c));
      ctx.fillRect(x - 2.4, top, 4.8, Math.max(2, bot - top));
    });
    /* бегущая линия цены */
    ctx.globalAlpha = quiet ? 0.18 : 0.45; ctx.strokeStyle = "rgba(60,231,255,.9)"; ctx.lineWidth = 1; ctx.beginPath();
    candles.forEach((c, i) => { const x = slot * (i + 1), y = baseY - c.c * 2.2; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke(); ctx.globalAlpha = 1;
    t++; tick();
  }
  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    if (lite()) { if (canvas.dataset.still !== "1") { resize(); draw(); canvas.dataset.still = "1"; } return; }
    const quiet = document.body.classList.contains("phase-academy");
    if (now - last < (quiet ? 66 : 40)) return;
    last = now; draw();
  }
  resize(); seed();
  addEventListener("resize", () => { canvas.dataset.still = ""; resize(); }, { passive: true });
  requestAnimationFrame(loop);
})();
