"""VOVCHOK ACADEMY bot — презентация академии и проводник в Mini App.

Сценарий: /start → выбор языка → главное фото → текст миссии → 4 инфографики (пауза между сообщениями)
→ финальный CTA с кнопками. Никаких постоянных клавиатур: всё показывается автоматически.
Метки решений берутся из trade-labels.js (единый источник с Mini App).
"""
import asyncio
import json
import logging
import os
from pathlib import Path

try:
    import mentor  # Claude + Nano Banana (нужен EMERGENT_LLM_KEY)
except Exception:  # noqa: BLE001
    mentor = None

from telegram import (
    Update,
    MenuButtonWebApp,
    WebAppInfo,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    ReplyKeyboardRemove,
)
from telegram.constants import ChatAction, ParseMode
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    MessageHandler,
    ContextTypes,
    filters,
)

from dotenv import load_dotenv
load_dotenv(Path(__file__).with_name(".env"))
load_dotenv(Path(__file__).resolve().parent.parent / "backend" / ".env")
TOKEN = os.environ["BOT_TOKEN"]
log = logging.getLogger("vovchok.bot")
ASSETS = Path(__file__).resolve().parent / "assets"
APP_URL = os.environ.get("MINI_APP_URL", "https://yearylyworker-collab.github.io/vovchok-academy/").rstrip("/")
APP_VER = os.environ.get("MINI_APP_VER", "v4")
CHANNEL_ID = os.environ.get("CHANNEL_ID", "").strip()  # @username или -100… ; бот должен быть админом канала
PARTNER = "https://comfortrade.com/ru?pid=n2y7nshp"
CHANNEL = "https://t.me/+LbZDg2Te0XE0OGJh"
DM = "https://t.me/Vovchokvtrade"
LANGS = ("ru", "uk", "ar")
PAUSE = 1.5  # пауза между сообщениями — текст «появляется» постепенно

ACTIVITY = None  # async (user_id: int, lang: str) — ставит backend, чтобы писать last_seen для напоминаний


def load_labels() -> dict:
    """Читает window.VA_TRADE_LABELS из trade-labels.js рядом с ботом."""
    p = Path(__file__).resolve().parent.parent / "docs" / "trade-labels.js"
    try:
        src = p.read_text(encoding="utf-8")
        body = src[src.index("{"): src.rindex("}") + 1]
        return json.loads(body)
    except Exception:
        return {
            "ru": {"call": "Вверх", "put": "Вниз", "wait": "Ждать"},
            "uk": {"call": "Вгору", "put": "Вниз", "wait": "Чекати"},
            "ar": {"call": "صعود", "put": "هبوط", "wait": "انتظار"},
        }


LABELS = load_labels()


def lb(lang: str, kind: str, full: bool = False) -> str:
    L = LABELS.get(lang) or LABELS["ru"]
    return L.get(kind + "_full" if full else kind) or L.get(kind) or kind.upper()


T = {
    "ru": {
        "choose": "🐺 <b>VOVCHOK ACADEMY</b>\n\n🌍 Выбери язык — дальше я веду тебя на нём.\n🇺🇦 Обери мову · 🇸🇦 اختر اللغة",
        "cap_welcome": "🐺 <b>Добро пожаловать в VOVCHOK ACADEMY</b>\n\n🎓 Интерактивная академия трейдинга прямо в Telegram.\n✨ Знания сегодня — свобода завтра.",
        "intro": "📊 Я не кидаю сигналы в чат. На графике всего три решения:\n\n📈 {call}\n📉 {put}\n⏳ {wait}\n\n🧠 Моя работа — научить тебя выбирать, а не угадывать.",
        "cap_access": "🚀 <b>Как получить доступ</b> — 4 простых шага\n\n1️⃣ Запусти бота\n2️⃣ Подпишись на канал академии\n3️⃣ Открой академию в Telegram\n4️⃣ Пройди модуль 1 — и первые XP твои",
        "cap_modules": "📚 <b>Программа академии</b>\n\n📖 12 модулей · 50 уроков · практика после каждого блока — от японских свечей до психологии и входа в сделку.",
        "cap_inside": "⚡ <b>Что внутри</b>\n\n🎯 Practice Lab с живыми графиками\n⭐ XP, уровни и достижения\n☁️ Прогресс хранится на сервере\n🌍 3 языка с полной локализацией",
        "cap_mentor": "🤖 <b>Волчок-наставник</b>\n\n💬 Напиши мне любой вопрос по трейдингу — отвечу как наставник.\n🧠 В практике разберу именно твою ошибку. Без сигналов — только обучение.",
        "cta": "🎯 <b>Готов начать?</b>\n\n📣 Подпишись на главный канал — это единственное условие входа.\n🎓 Затем жми «Войти в академию» и проходи модуль 1.\n💬 Любой вопрос по трейдингу — пиши прямо в чат.",
        "open": "🎓 Войти в академию",
        "trade": "🤝 ComfortTrade",
        "channel": "📣 Подписаться на канал",
        "more": "🐺 Подсказка от волка",
        "check_sub": "✅ Проверить подписку",
        "hint": "🐺 Коротко, как в уроке:\n\n⏳ нет структуры — {wait}\n📈 {call} — только со структурой вверх\n📉 {put} — только со структурой вниз\n🕯 цвет свечи ≠ тренд\n\n🎓 Открой академию и пройди модуль 1.",
        "sub_ok": "✅ Вижу подписку — доступ открыт. Входи в академию 🎓",
        "sub_no": "❌ Подписки пока не вижу. Подпишись на канал и нажми «Проверить подписку» ещё раз 📣",
        "help": "🐺 <b>Команды</b>\n\n▶️ /start — презентация академии\n🎓 /academy — открыть академию\n💬 /quote — цитата дня\n🧠 /hint — подсказка\n🌍 /lang — сменить язык\n\n✍️ Любой вопрос по трейдингу — просто напиши в чат. Сигналов не даю.",
        "quote_cap": "🐺 {q}\n\n— Волчок · VOVCHOK ACADEMY",
        "ai_off": "🐺 Наставник сейчас недоступен. Открой академию — там разбор в каждом уроке 🎓",
        "explain_call": "📈 {call_full}. Это не кнопка «купи» — это решение, что цена будет выше к сроку. Без структуры вверх — не жми.",
        "explain_put": "📉 {put_full}. Решение, что цена будет ниже к сроку. Без структуры вниз — не жми.",
        "explain_wait": "⏳ {wait_full}. Нет зоны, нет закрепления, пила — это тоже решение. Часто сильнее входа.",
        "fallback": "🐺 Не разжёвываю рынок в чате. Открой академию — там график, сценарий и разбор 🎓",
        "disclaimer": "⚠️ Торговля связана с высоким риском и может привести к потере всех средств. Материалы академии — обучение, не инвестиционная рекомендация.",
    },
    "uk": {
        "choose": "🐺 <b>VOVCHOK ACADEMY</b>\n\n🌍 Обери мову — далі я веду тебе нею.\n🇷🇺 Выбери язык · 🇸🇦 اختر اللغة",
        "cap_welcome": "🐺 <b>Вітаю у VOVCHOK ACADEMY</b>\n\n🎓 Інтерактивна академія трейдингу просто в Telegram.\n✨ Знання сьогодні — свобода завтра.",
        "intro": "📊 Я не кидаю сигнали в чат. На графіку лише три рішення:\n\n📈 {call}\n📉 {put}\n⏳ {wait}\n\n🧠 Моя робота — навчити тебе обирати, а не вгадувати.",
        "cap_access": "🚀 <b>Як отримати доступ</b> — 4 простих кроки\n\n1️⃣ Запусти бота\n2️⃣ Підпишись на канал академії\n3️⃣ Відкрий академію в Telegram\n4️⃣ Пройди модуль 1 — і перші XP твої",
        "cap_modules": "📚 <b>Програма академії</b>\n\n📖 12 модулів · 50 уроків · практика після кожного блоку — від японських свічок до психології та входу в угоду.",
        "cap_inside": "⚡ <b>Що всередині</b>\n\n🎯 Practice Lab із живими графіками\n⭐ XP, рівні та досягнення\n☁️ Прогрес зберігається на сервері\n🌍 3 мови з повною локалізацією",
        "cap_mentor": "🤖 <b>Вовчик-наставник</b>\n\n💬 Напиши мені будь-яке питання про трейдинг — відповім як наставник.\n🧠 У практиці розберу саме твою помилку. Без сигналів — лише навчання.",
        "cta": "🎯 <b>Готовий почати?</b>\n\n📣 Підпишись на головний канал — це єдина умова входу.\n🎓 Потім тисни «Увійти в академію» і проходь модуль 1.\n💬 Будь-яке питання про трейдинг — пиши прямо в чат.",
        "open": "🎓 Увійти в академію",
        "trade": "🤝 ComfortTrade",
        "channel": "📣 Підписатися на канал",
        "more": "🐺 Підказка від вовка",
        "check_sub": "✅ Перевірити підписку",
        "hint": "🐺 Коротко, як в уроці:\n\n⏳ немає структури — {wait}\n📈 {call} — лише зі структурою вгору\n📉 {put} — лише зі структурою вниз\n🕯 колір свічки ≠ тренд\n\n🎓 Відкрий академію і пройди модуль 1.",
        "sub_ok": "✅ Бачу підписку — доступ відкрито. Заходь в академію 🎓",
        "sub_no": "❌ Підписки поки не бачу. Підпишись на канал і натисни «Перевірити підписку» ще раз 📣",
        "help": "🐺 <b>Команди</b>\n\n▶️ /start — презентація академії\n🎓 /academy — відкрити академію\n💬 /quote — цитата дня\n🧠 /hint — підказка\n🌍 /lang — змінити мову\n\n✍️ Будь-яке питання про трейдинг — просто напиши в чат. Сигналів не даю.",
        "quote_cap": "🐺 {q}\n\n— Вовчик · VOVCHOK ACADEMY",
        "ai_off": "🐺 Наставник зараз недоступний. Відкрий академію — там розбір у кожному уроці 🎓",
        "explain_call": "📈 {call_full}. Це не кнопка «купи» — це рішення, що ціна буде вищою до строку. Без структури вгору — не тисни.",
        "explain_put": "📉 {put_full}. Рішення, що ціна буде нижчою до строку. Без структури вниз — не тисни.",
        "explain_wait": "⏳ {wait_full}. Немає зони, немає закріплення, пилка — це теж рішення. Часто сильніше за вхід.",
        "fallback": "🐺 Не розжовую ринок у чаті. Відкрий академію — там графік, сценарій і розбір 🎓",
        "disclaimer": "⚠️ Торгівля пов'язана з високим ризиком і може призвести до втрати всіх коштів. Матеріали академії — навчання, не інвестиційна рекомендація.",
    },
    "ar": {
        "choose": "🐺 <b>VOVCHOK ACADEMY</b>\n\n🌍 اختر اللغة — وسأرشدك بها.\n🇷🇺 Выбери язык · 🇺🇦 Обери мову",
        "cap_welcome": "🐺 <b>مرحباً بك في VOVCHOK ACADEMY</b>\n\n🎓 أكاديمية تداول تفاعلية داخل تيليجرام.\n✨ المعرفة اليوم — الحرية غداً.",
        "intro": "📊 أنا لا أرمي إشارات في الدردشة. على الرسم البياني ثلاثة قرارات فقط:\n\n📈 {call}\n📉 {put}\n⏳ {wait}\n\n🧠 مهمتي أن أعلّمك الاختيار لا التخمين.",
        "cap_access": "🚀 <b>كيف تحصل على الوصول</b> — أربع خطوات\n\n1️⃣ شغّل البوت\n2️⃣ اشترك في قناة الأكاديمية\n3️⃣ افتح الأكاديمية داخل تيليجرام\n4️⃣ أنجز الوحدة الأولى — وأول نقاط XP لك",
        "cap_modules": "📚 <b>برنامج الأكاديمية</b>\n\n📖 12 وحدة · 50 درساً · تدريب بعد كل قسم — من الشموع اليابانية إلى علم النفس والدخول في الصفقة.",
        "cap_inside": "⚡ <b>ماذا يوجد بالداخل</b>\n\n🎯 Practice Lab مع رسوم حقيقية\n⭐ XP ومستويات وإنجازات\n☁️ التقدّم محفوظ على الخادم\n🌍 ثلاث لغات بترجمة كاملة",
        "cap_mentor": "🤖 <b>فولتشوك المرشد</b>\n\n💬 أرسل أي سؤال عن التداول — أجيب كمرشد.\n🧠 وفي التدريب أشرح خطأك تحديداً. بلا إشارات — تعليم فقط.",
        "cta": "🎯 <b>جاهز للبدء؟</b>\n\n📣 اشترك في القناة الرئيسية — هذا شرط الدخول الوحيد.\n🎓 ثم اضغط «الدخول إلى الأكاديمية» وأنجز الوحدة الأولى.\n💬 أي سؤال عن التداول — اكتبه في الدردشة.",
        "open": "🎓 الدخول إلى الأكاديمية",
        "trade": "🤝 ComfortTrade",
        "channel": "📣 الاشتراك في القناة",
        "more": "🐺 تلميح من الذئب",
        "check_sub": "✅ التحقق من الاشتراك",
        "hint": "🐺 باختصار، كما في الدرس:\n\n⏳ لا بنية — {wait}\n📈 {call} — فقط مع بنية صاعدة\n📉 {put} — فقط مع بنية هابطة\n🕯 لون الشمعة ≠ الاتجاه\n\n🎓 افتح الأكاديمية وأنجز الوحدة 1.",
        "sub_ok": "✅ أرى الاشتراك — الوصول مفتوح. ادخل إلى الأكاديمية 🎓",
        "sub_no": "❌ لا أرى الاشتراك بعد. اشترك في القناة واضغط «التحقق من الاشتراك» مجدداً 📣",
        "help": "🐺 <b>الأوامر</b>\n\n▶️ /start — تقديم الأكاديمية\n🎓 /academy — فتح الأكاديمية\n💬 /quote — اقتباس اليوم\n🧠 /hint — تلميح\n🌍 /lang — تغيير اللغة\n\n✍️ أي سؤال عن التداول — اكتبه في الدردشة. لا أعطي إشارات.",
        "quote_cap": "🐺 {q}\n\n— فولتشوك · VOVCHOK ACADEMY",
        "ai_off": "🐺 المرشد غير متاح الآن. افتح الأكاديمية — هناك تحليل في كل درس 🎓",
        "explain_call": "📈 {call_full}. ليس زر «اشترِ» — بل قرار أن السعر سيكون أعلى عند الانتهاء. بلا بنية صاعدة — لا تضغط.",
        "explain_put": "📉 {put_full}. قرار أن السعر سيكون أدنى عند الانتهاء. بلا بنية هابطة — لا تضغط.",
        "explain_wait": "⏳ {wait_full}. لا منطقة، لا تثبيت، تذبذب — هذا قرار أيضاً. غالباً أقوى من الدخول.",
        "fallback": "🐺 لا أشرح السوق في الدردشة. افتح الأكاديمية — هناك الرسم والسيناريو والتحليل 🎓",
        "disclaimer": "⚠️ التداول ينطوي على مخاطر عالية وقد يؤدي إلى خسارة كامل الأموال. مواد الأكاديمية تعليمية وليست توصية استثمارية.",
    },
}


def tx(lang: str, key: str) -> str:
    lang = lang if lang in LANGS else "ru"
    s = T[lang].get(key) or T["ru"].get(key, key)
    return s.format(
        call=lb(lang, "call"), put=lb(lang, "put"), wait=lb(lang, "wait"),
        call_full=lb(lang, "call", True), put_full=lb(lang, "put", True), wait_full=lb(lang, "wait", True),
    )


def app_url(lang: str) -> str:
    return f"{APP_URL}/?lang={lang}&v={APP_VER}"


def lang_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([[
        InlineKeyboardButton("🇷🇺 Русский", callback_data="lang:ru"),
        InlineKeyboardButton("🇺🇦 Українська", callback_data="lang:uk"),
        InlineKeyboardButton("🇸🇦 العربية", callback_data="lang:ar"),
    ]])


def app_kb(lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton(tx(lang, "channel"), url=CHANNEL)],
        *([[InlineKeyboardButton(tx(lang, "check_sub"), callback_data="sub:" + lang)]] if CHANNEL_ID else []),
        [InlineKeyboardButton(tx(lang, "open"), web_app=WebAppInfo(url=app_url(lang)))],
        [InlineKeyboardButton(tx(lang, "trade"), url=PARTNER)],
        [InlineKeyboardButton(tx(lang, "more"), callback_data="hint:" + lang)],
    ])


def user_lang(update: Update, context: ContextTypes.DEFAULT_TYPE) -> str:
    lang = context.user_data.get("lang")
    if lang in LANGS:
        return lang
    code = (update.effective_user.language_code or "ru")[:2] if update.effective_user else "ru"
    return code if code in LANGS else "ru"


async def touch(update: Update, lang: str) -> None:
    if ACTIVITY and update.effective_user:
        try:
            await ACTIVITY(update.effective_user.id, lang)
        except Exception as e:  # noqa: BLE001
            log.warning("activity hook failed: %s", e)


async def _photo(context: ContextTypes.DEFAULT_TYPE, chat_id: int, name: str, caption: str) -> None:
    """Отправка картинки с кэшем file_id — повторные показы моментальные и без перезагрузки файла."""
    key = "fid:" + name
    fid = context.bot_data.get(key)
    try:
        if fid:
            await context.bot.send_photo(chat_id, fid, caption=caption, parse_mode=ParseMode.HTML)
            return
        path = ASSETS / name
        with path.open("rb") as f:
            m = await context.bot.send_photo(chat_id, f, caption=caption, parse_mode=ParseMode.HTML)
        if m.photo:
            context.bot_data[key] = m.photo[-1].file_id
    except FileNotFoundError:
        log.warning("asset missing: %s", name)
        await context.bot.send_message(chat_id, caption, parse_mode=ParseMode.HTML)


async def present(context: ContextTypes.DEFAULT_TYPE, chat_id: int, lang: str) -> None:
    """Презентация академии: фото → текст → инфографики → CTA. Между сообщениями пауза и «печатает…»."""
    await context.bot.send_chat_action(chat_id, ChatAction.UPLOAD_PHOTO)
    await _photo(context, chat_id, "welcome.png", tx(lang, "cap_welcome"))
    await asyncio.sleep(PAUSE)
    await context.bot.send_chat_action(chat_id, ChatAction.TYPING)
    await asyncio.sleep(1.2)
    await context.bot.send_message(chat_id, tx(lang, "intro"), parse_mode=ParseMode.HTML,
                                   reply_markup=ReplyKeyboardRemove())
    for name, key in (("access", "cap_access"), ("modules", "cap_modules"), ("inside", "cap_inside"), ("mentor", "cap_mentor")):
        await asyncio.sleep(PAUSE)
        await context.bot.send_chat_action(chat_id, ChatAction.UPLOAD_PHOTO)
        await _photo(context, chat_id, f"{name}_{lang}.png", tx(lang, key))
    await asyncio.sleep(PAUSE)
    await context.bot.send_chat_action(chat_id, ChatAction.TYPING)
    await asyncio.sleep(1.2)
    await context.bot.send_message(chat_id, tx(lang, "cta") + "\n\n" + tx(lang, "disclaimer"),
                                   parse_mode=ParseMode.HTML, reply_markup=app_kb(lang))


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message:
        return
    lang = user_lang(update, context)
    await touch(update, lang)
    await context.bot.send_chat_action(update.message.chat_id, ChatAction.TYPING)
    await asyncio.sleep(0.8)
    await update.message.reply_text(tx(lang, "choose"), parse_mode=ParseMode.HTML,
                                    reply_markup=lang_kb())


async def is_subscribed(bot, user_id: int) -> bool:
    if not CHANNEL_ID:
        return True
    try:
        m = await bot.get_chat_member(CHANNEL_ID, user_id)
        return m.status in ("member", "administrator", "creator")
    except Exception as e:  # noqa: BLE001
        log.warning("get_chat_member failed: %s", e)
        return False


async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if update.message:
        lang = user_lang(update, context)
        await update.message.reply_text(tx(lang, "help"), parse_mode=ParseMode.HTML, reply_markup=app_kb(lang))


async def on_error(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    log.exception("bot error: %s", context.error)


async def on_cb(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    q = update.callback_query
    if not q or not q.data:
        return
    await q.answer()
    kind, _, lang = q.data.partition(":")
    lang = lang if lang in LANGS else "ru"
    await touch(update, lang)
    if kind == "lang":
        context.user_data["lang"] = lang
        if q.message:
            await present(context, q.message.chat_id, lang)
    elif kind == "sub" and q.message:
        ok = await is_subscribed(context.bot, q.from_user.id)
        await q.message.reply_text(tx(lang, "sub_ok" if ok else "sub_no"), reply_markup=app_kb(lang))
    elif kind == "hint" and q.message:
        await q.message.reply_text(tx(lang, "hint"), reply_markup=app_kb(lang))


async def send_quote(msg, lang: str) -> None:
    if not mentor or not mentor.KEY:
        return await msg.reply_text(tx(lang, "ai_off"))
    await msg.chat.send_action(ChatAction.UPLOAD_PHOTO)
    try:
        q, img = await mentor.quote_card(lang)
        cap = tx(lang, "quote_cap").format(q=q)
        if img:
            await msg.reply_photo(photo=img, caption=cap)
        else:
            await msg.reply_text(cap)
    except Exception as e:  # noqa: BLE001
        log.warning("quote failed: %s", e)
        await msg.reply_text(tx(lang, "ai_off"))


async def mentor_answer(msg, lang: str, question: str) -> None:
    if not mentor or not mentor.KEY:
        return await msg.reply_text(tx(lang, "fallback"), reply_markup=app_kb(lang))
    await msg.chat.send_action(ChatAction.TYPING)
    try:
        answer = await mentor.ask(lang, question, session=f"tg-{msg.chat_id}")
        await msg.reply_text("🐺 " + answer, reply_markup=app_kb(lang))
    except Exception as e:  # noqa: BLE001
        log.warning("mentor failed: %s", e)
        await msg.reply_text(tx(lang, "ai_off"), reply_markup=app_kb(lang))


async def on_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.message.text:
        return
    lang = user_lang(update, context)
    text = update.message.text.strip()
    cmd = text.split("@")[0].lower()
    await touch(update, lang)
    if cmd in ("/academy", "academy"):
        return await present(context, update.message.chat_id, lang)
    if cmd == "/hint":
        return await update.message.reply_text(tx(lang, "hint"), reply_markup=app_kb(lang))
    if cmd == "/lang":
        return await update.message.reply_text(tx(lang, "choose"), parse_mode=ParseMode.HTML, reply_markup=lang_kb())
    if cmd == "/quote":
        return await send_quote(update.message, lang)
    for l in LANGS:  # тапнул по слову-решению — объясняем без обращения к ИИ
        for kind in ("call", "put", "wait"):
            if text == lb(l, kind):
                return await update.message.reply_text(tx(lang, "explain_" + kind), reply_markup=app_kb(lang))
    await mentor_answer(update.message, lang, text)


async def post_init(app: Application) -> None:
    await app.bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(text="Academy", web_app=WebAppInfo(url=app_url("ru")))
    )


def build_application() -> Application:
    application = Application.builder().token(TOKEN).post_init(post_init).concurrent_updates(True).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_cmd))
    application.add_error_handler(on_error)
    application.add_handler(CommandHandler(["academy", "hint", "lang", "quote"], on_text))
    application.add_handler(CallbackQueryHandler(on_cb))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))
    return application


def main() -> None:
    application = build_application()
    webhook = os.environ.get("WEBHOOK_URL", "").strip().rstrip("/")
    if webhook:
        path = os.environ.get("WEBHOOK_PATH", "tg").strip("/")
        application.run_webhook(
            listen=os.environ.get("LISTEN", "0.0.0.0"),
            port=int(os.environ.get("PORT", "8443")),
            url_path=path,
            webhook_url=webhook + "/" + path,
            secret_token=os.environ.get("WEBHOOK_SECRET") or None,
            allowed_updates=Update.ALL_TYPES,
        )
    else:
        application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
