# VOVCHOK ACADEMY — Telegram Mini App + бот

Статический Mini App (GitHub Pages) + Python-бот `bot.py`.

## Структура
| Файл | Назначение |
|---|---|
| `index.html` | Оболочка. Все скрипты подключены статически, `?v=v3` — версия для сброса кэша |
| `content.js` | `VA_I18N` — полный UI-словарь ru / uk / ar |
| `trade-labels.js` | Единые метки решений (Вверх / Вниз / Ждать) — читаются и Mini App, и ботом |
| `lessons-m1..m12.js` | Единственный источник контента. 12 модулей × 3 урока × 2 шага + практика, все на 3 языках |
| `chart.js` | Детерминированные сценарные графики (паттерны, зоны, сигнальная свеча) |
| `progress.js` | Прогресс в localStorage (`va_progress`): пройденные уроки, практики, «продолжить с места» |
| `player.js` | Плеер уроков, практика с проверкой ответа и разбором, профиль |
| `app.js` | Ядро: язык, RTL, i18n, оболочка экранов, дисклеймер |
| `story.js` | Онбординг (выбор языка → доступ → вход) |
| `boot.js` | Telegram WebApp init, `?lang=` из бота, навигация |
| `done-mark.js` | Отметки ✓ по реальному прогрессу |
| `academy.css` | Новые компоненты + RTL-зеркалирование |
| `tools/check-i18n.js` | Контроль полноты перевода: `node tools/check-i18n.js` |

## Бот
```bash
pip install -r requirements.txt
BOT_TOKEN=... MINI_APP_URL=https://yearylyworker-collab.github.io/vovchok-academy python bot.py
```
Метки кнопок берутся из `trade-labels.js`, ссылка на Mini App — `?lang=<ru|uk|ar>&v=v3`.

## Деплой
Push в `main` → GitHub Actions собирает `dist/` и штампует `?v=` датой коммита.
При ручной правке — бампни `?v=` в `index.html`.

## Проверка перевода
```bash
node tools/check-i18n.js   # exit 1, если где-то нет ru/uk/ar
```
В рантайме пропуски собираются в `window.VA_MISSING` (сейчас пусто).
