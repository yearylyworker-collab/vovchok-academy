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
