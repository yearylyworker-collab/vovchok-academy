/* Метаданные банка практики: категория, сложность, ключ верного варианта (A/B/C/D). Тексты сценариев — в lessons-m*.js. 
   Варианты: A — {call}, B — {put}, C — дождаться подтверждения, D — не входить. */
window.VA_BANK = {
  m1p:   { cat: "trend",      diff: "easy",   key: "A" },
  m2p:   { cat: "candles",    diff: "easy",   key: "D" },
  m3p:   { cat: "timeframes", diff: "medium", key: "D" },
  m4p:   { cat: "trend",      diff: "easy",   key: "B" },
  m5p:   { cat: "levels",     diff: "medium", key: "D" },
  m6p:   { cat: "reversals",  diff: "medium", key: "B" },
  m7p:   { cat: "indicators", diff: "hard",   key: "B" },
  m8p:   { cat: "levels",     diff: "medium", key: "C" },
  m9p:   { cat: "psychology", diff: "easy",   key: "D" },
  m10p:  { cat: "entry",      diff: "medium", key: "A" },
  m11p:  { cat: "context",    diff: "hard",   key: "B" },
  m12p1: { cat: "trend",      diff: "hard",   key: "A" },
  m12p2: { cat: "levels",     diff: "medium", key: "D" }
};
/* Категория → модуль для «повторить тему» */
window.VA_CAT_MODULE = { candles: 2, timeframes: 3, trend: 4, levels: 5, reversals: 6, indicators: 7, context: 8, psychology: 9, entry: 10 };
