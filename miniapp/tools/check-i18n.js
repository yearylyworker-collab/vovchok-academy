#!/usr/bin/env node
/* Контроль полноты перевода: все поля {ru,uk,ar} в уроках и все ключи VA_I18N / VA_TRADE_LABELS.
   Запуск: node tools/check-i18n.js  (код выхода 1, если есть пропуски) */
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..");
const LANGS = ["ru", "uk", "ar"];
const ctx = { window: {} }; ctx.window = ctx;
vm.createContext(ctx);
["content.js", "trade-labels.js", ...Array.from({ length: 12 }, (_, i) => `lessons-m${i + 1}.js`)].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
});
const problems = [];
const need = (obj, where) => {
  if (!obj || typeof obj !== "object") { problems.push(`${where}: not an object`); return; }
  LANGS.forEach((l) => { if (!obj[l] || !String(obj[l]).trim()) problems.push(`${where}: missing ${l}`); });
};
/* UI */
const ui = ctx.VA_I18N, ruKeys = Object.keys(ui.ru);
LANGS.forEach((l) => ruKeys.forEach((k) => { if (ui[l][k] === undefined || ui[l][k] === "") problems.push(`VA_I18N.${l}.${k}: missing`); }));
LANGS.forEach((l) => { if (!Array.isArray(ui[l].modules) || ui[l].modules.length !== 12) problems.push(`VA_I18N.${l}.modules: need 12`); });
/* labels */
LANGS.forEach((l) => ["call", "put", "wait", "call_full", "put_full", "wait_full"].forEach((k) => { if (!ctx.VA_TRADE_LABELS[l] || !ctx.VA_TRADE_LABELS[l][k]) problems.push(`VA_TRADE_LABELS.${l}.${k}: missing`); }));
/* lessons */
let lessons = 0, pages = 0, practices = 0;
const PATTERNS = fs.readFileSync(path.join(ROOT, "chart.js"), "utf8").match(/^\s{4}([a-z_]+):\s*\{ pts/gm).map((s) => s.trim().split(":")[0]);
for (let m = 1; m <= 12; m++) {
  const arr = ctx.VA_LESSONS["m" + m];
  if (!arr || arr.length < 3) problems.push(`m${m}: less than 3 items`);
  (arr || []).forEach((ls) => {
    lessons++;
    need(ls.title, `${ls.id}.title`);
    if (ls.type === "practice") {
      practices++;
      need(ls.wolf, `${ls.id}.wolf`); need(ls.scenario, `${ls.id}.scenario`); need(ls.explain, `${ls.id}.explain`);
      if (!["call", "put", "wait"].includes(ls.answer)) problems.push(`${ls.id}: answer missing`);
      if (!ls.chart || !PATTERNS.includes(ls.chart.p)) problems.push(`${ls.id}: bad chart pattern`);
      Object.keys(ls.wrong || {}).forEach((k) => need(ls.wrong[k], `${ls.id}.wrong.${k}`));
    } else {
      if (!ls.pages || ls.pages.length < 2) problems.push(`${ls.id}: less than 2 pages`);
      (ls.pages || []).forEach((p, i) => {
        pages++;
        need(p.title, `${ls.id}[${i}].title`); need(p.wolf, `${ls.id}[${i}].wolf`); need(p.html, `${ls.id}[${i}].html`);
        if (p.chart && !PATTERNS.includes(p.chart.p)) problems.push(`${ls.id}[${i}]: bad chart pattern ${p.chart.p}`);
      });
    }
  });
}
console.log(`lessons=${lessons} pages=${pages} practices=${practices} langs=${LANGS.join(",")}`);
if (problems.length) { console.error("MISSING:\n" + problems.join("\n")); process.exit(1); }
console.log("i18n OK — перевод полный на всех языках");
