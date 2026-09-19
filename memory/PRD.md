# Vovchok Academy — PRD

## Original problem statement
Telegram Mini App (static GitHub Pages, vanilla JS) + Python bot `bot.py`. Финальный план доводки: Фаза 0 (один источник контента) → 1 (наполнить 12 модулей) → 2 (ru/uk/ar + RTL) → 3 (настоящая практика) → 4 (профиль/прогресс) → 5 (живой проводник) → 6 (стабилизация, дисклеймер, бот, кэш).
Source repo: https://github.com/yearylyworker-collab/vovchok-academy (Pages: https://yearylyworker-collab.github.io/vovchok-academy/). Test bot: @vovchok_academy_bot.

## User choices
- Languages all at once (ru/uk/ar parallel), translations done carefully, no external proofreading required
- 3 lessons per module (m1 has 4) + practice each (m12 has 2 practices)
- Bot verified live (getMe + polling start + menu button)

## Architecture
- `/app/miniapp/` — the whole Mini App (source of truth). Served for preview via FastAPI StaticFiles at `/api/miniapp/`.
- Static includes in `index.html` (`?v=v3`); no pack.js / lessons-core.js duplicates (removed).
- `content.js` VA_I18N (full UI, 3 langs) · `trade-labels.js` (shared labels, parsed also by bot.py) · `lessons-m1..m12.js` (50 items, 74 pages, 13 practices, all 3 langs) · `chart.js` (deterministic scenario charts) · `progress.js` (localStorage) · `player.js` · `app.js` · `story.js` (onboarding) · `boot.js` · `done-mark.js` · `icons.js` · `wolf.js` (moods) · `academy.css` + `motion.css` (RTL, animations) · `tools/check-i18n.js`.
- `bot.py` — python-telegram-bot v21; labels from trade-labels.js; Mini App URL `?lang=<l>&v=v3`; 3 langs.

## Implemented (2026-06)
- Phase 0–6 complete: content consolidation, 12 modules filled, 3 languages + RTL, real practice with feedback, profile/progress/continue, guide moods + typing + transitions, disclaimer, bot updated, cache version v3, i18n completeness check (node script + runtime VA_MISSING).
- Live UI pass (user feedback): animated background (particles/candles/aurora/grid), SVG nav icons, screen transitions/stagger, wolf on every screen with mood-driven mimics, community cards + rules.
- Testing agent iteration_1: all passed, 0 console errors.

- Funnel v2 (user request): channel-subscription gate instead of partner registration — welcome → conditions (glowing subscribe button, auto-scroll) → animated check (ring 0–100%, 4 ticks) → reward (confetti, 4 showcase tiles with mini charts) → home. Header brand centered. Bot texts/buttons updated (first button = subscribe). Testing iteration_2 passed.
- Note: subscription check is animated/simulated (static Pages can't call Telegram API); real check requires bot endpoint (getChatMember) — backlog.

- Haptics (VA.haptic): Telegram HapticFeedback success/error on practice answers and lesson completion, light impact on nav taps; navigator.vibrate fallback. Testing iteration_3 passed.

- Client-spec redesign (iteration_4 passed): home hero + ring + accordion, Practice Lab (A/B/C/D, filters, weak topics, replay, XP), profile (XP/level/streak/achievements/stats/weak topics/lang), community (2 cards + banner). State in progress.js.
- Claude Sonnet 4.6 mentor (iteration_5 passed): mentor.py (ask/explain/quote_card), backend /api/mentor/ask|explain (Mongo log mentor_messages), bot free-text answers + /quote Nano Banana card, bot runs inside backend (RUN_BOT=1). Mini App button "Спросить Волчка, почему". VA_API_URL in index.html for GitHub Pages.

- Repo layout for GitHub: /app/docs = Mini App static (GitHub Pages source = /docs), /app/bot = bot.py + mentor.py, /app/.github/workflows/pages.yml publishes docs/ (branches main, emergent). Bot: /help, error handler, concurrent updates, optional real subscription check (CHANNEL_ID env → getChatMember), MINI_APP_URL currently points to preview for testing. Note: BotFather menu button URL overrides API (user must update in BotFather).

## Backlog
- P1: Push files to user's GitHub repo (user does via "Save to GitHub" / copy `/app/miniapp/*` to repo root); real iPhone Telegram tap test by user.
- P2: Server-side progress (Path B), more practice scenarios per module, sound/haptics via Telegram WebApp HapticFeedback.

## Fork check (Sep 2026)
- Post-fork smoke test passed: backend + bot polling running, /api/miniapp/ serves /app/docs, /api/mentor/* responds. No code changes needed.
- Deployment reminder for user: Save to GitHub → enable Pages (source /docs); Publish backend; then set window.VA_API_URL in docs/index.html to published backend URL + "/api" and update MINI_APP_URL in backend/.env + BotFather menu button.

## Итерация 7 (июнь 2026) — прогресс на сервере, напоминания, новая презентация бота
- Серверный прогресс: `backend/sync_store.py` (проверка Telegram initData HMAC + merge без потерь), эндпоинты `POST /api/progress/sync`, `POST /api/progress/reset`, `GET /api/progress/{uid}`, коллекция Mongo `progress`. Фронт: `docs/sync.js` (пуш с debounce 1.5s, пуш при visibilitychange, merge при старте), `VAProgress.exportState/importState`, карточка «Синхронизация прогресса» в профиле (`profile-sync`, кнопка `sync-now-button`), ключи i18n `sync_*` в 3 языках.
- Напоминания: `bot/reminders.py` — раз в 30 мин ищет учеников с простоем 2+ дня (`last_seen`) и отправляет мотивационное сообщение (4 фиксированных варианта × 3 языка, подстановка XP и числа уроков), не чаще 1 раза в 2 дня, без ограничения по количеству. Активность пишется из Mini App (sync) и из бота (`bot.ACTIVITY` → `_touch_user`). Без расхода AI.
- Бот переписан под новый сценарий: `/start` → выбор языка → главное фото `welcome.png` → текст о трёх решениях → 4 инфографики (`access/modules/inside/mentor` × ru/uk/ar) → финальный CTA. Паузы 1.5 с + chat action, эмодзи во всех текстах и кнопках, постоянная reply-клавиатура удалена, картинки кэшируются по file_id.
- Инфографики: `bot/promo/build.py` (HTML + headless Chrome → PNG 1672×941, шрифты Montserrat/Noto Sans Arabic/Caveat), 12 картинок в `bot/assets/`; главное фото — от заказчика.
- Документы для сдачи: `memory/CLIENT_REPORT.md` (состав продукта, расчёт AI-затрат под $50, обоснование цены и сравнение с рынком), `memory/HANDOVER.md` (передача бота, хостинг 24/7, подписка, GitHub Pages, VPS).
- Тесты: iteration_7 — backend 14/14 pytest (`backend/tests/test_progress_sync.py`), фронт E2E восстановления прогресса после очистки localStorage, 0 ошибок консоли; `tests/test_bot_flow.py` — сценарий презентации в 3 языках.
