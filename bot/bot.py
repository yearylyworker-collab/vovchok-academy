"""VOVCHOK ACADEMY bot — проводник в Mini App. Метки решений берутся из trade-labels.js (единый источник с Mini App)."""
import json
import os
import re
from pathlib import Path
import logging

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
    ReplyKeyboardMarkup,
    KeyboardButton,
)
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
APP_URL = os.environ.get("MINI_APP_URL", "https://yearylyworker-collab.github.io/vovchok-academy/").rstrip("/")
APP_VER = os.environ.get("MINI_APP_VER", "v4")
CHANNEL_ID = os.environ.get("CHANNEL_ID", "").strip()  # @username или -100… ; бот должен быть админом канала
PARTNER = "https://comfortrade.com/ru?pid=n2y7nshp"
CHANNEL = "https://t.me/+LbZDg2Te0XE0OGJh"
DM = "https://t.me/Vovchokvtrade"
LANGS = ("ru", "uk", "ar")


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
        "choose": "Я Волчок. Перед входом выбери язык — дальше веду на нём.",
        "hello": "Знания сегодня — свобода завтра.\n\nЯ не кидаю сигналы в чат. На графике только три решения:\n• {call}\n• {put}\n• {wait}\n\nУсловие входа одно — подписка на главный канал академии. Подпишись и открой академию — я уже внутри.",
        "open": "Войти в академию",
        "trade": "ComfortTrade",
        "channel": "Подписаться на канал",
        "more": "Ещё от волка",
        "hint": "Коротко, как в уроке:\n• нет структуры — {wait}\n• {call} — только со структурой вверх\n• {put} — только со структурой вниз\n• цвет свечи ≠ тренд\n\nОткрой академию и пройди модуль 1.",
        "kb_app": "Академия",
        "kb_hint": "Подсказка",
        "kb_lang": "Язык", "kb_quote": "Цитата дня", "check_sub": "Проверить подписку ✅", "sub_ok": "Вижу подписку — доступ открыт. Входи в академию.", "sub_no": "Подписки пока не вижу. Подпишись на канал и нажми «Проверить подписку» ещё раз.", "help": "Команды:\n/start — начать\n/academy — открыть академию\n/quote — цитата дня\n/hint — подсказка\n/lang — язык\n\nЛюбой вопрос по трейдингу — отвечу как наставник. Сигналов не даю.", "thinking": "Волчок думает…", "quote_cap": "🐺 {q}\n\n— Волчок · VOVCHOK ACADEMY", "ai_off": "Наставник сейчас недоступен. Открой академию — там разбор в каждом уроке.",
        "explain_call": "{call_full}. Это не кнопка «купи» — это решение, что цена будет выше к сроку. Без структуры вверх — не жми.",
        "explain_put": "{put_full}. Решение, что цена будет ниже к сроку. Без структуры вниз — не жми.",
        "explain_wait": "{wait_full}. Нет зоны, нет закрепления, пила — это тоже решение. Часто сильнее входа.",
        "fallback": "Не разжёвываю рынок в чате. Открой академию — там график, сценарий и разбор.",
        "menu_hint": "Кнопка «Academy» слева внизу или большая кнопка выше.",
        "disclaimer": "⚠️ Торговля связана с высоким риском и может привести к потере всех средств. Материалы академии — обучение, не инвестиционная рекомендация.",
    },
    "uk": {
        "choose": "Я Вовчик. Обери мову — далі веду нею.",
        "hello": "Знання сьогодні — свобода завтра.\n\nЯ не кидаю сигнали в чат. На графіку лише три рішення:\n• {call}\n• {put}\n• {wait}\n\nУмова входу одна — підписка на головний канал академії. Підпишись і відкрий академію — я вже всередині.",
        "open": "Увійти в академію",
        "trade": "ComfortTrade",
        "channel": "Підписатися на канал",
        "more": "Ще від вовка",
        "hint": "Коротко, як в уроці:\n• немає структури — {wait}\n• {call} — лише зі структурою вгору\n• {put} — лише зі структурою вниз\n• колір свічки ≠ тренд\n\nВідкрий академію і пройди модуль 1.",
        "kb_app": "Академія",
        "kb_hint": "Підказка",
        "kb_lang": "Мова", "kb_quote": "Цитата дня", "check_sub": "Проверить подписку ✅", "sub_ok": "Вижу подписку — доступ открыт. Входи в академию.", "sub_no": "Подписки пока не вижу. Подпишись на канал и нажми «Проверить подписку» ещё раз.", "help": "Команды:\n/start — начать\n/academy — открыть академию\n/quote — цитата дня\n/hint — подсказка\n/lang — язык\n\nЛюбой вопрос по трейдингу — отвечу как наставник. Сигналов не даю.", "thinking": "Вовчик думає…", "quote_cap": "🐺 {q}\n\n— Вовчик · VOVCHOK ACADEMY", "ai_off": "Наставник зараз недоступний. Відкрий академію — там розбір у кожному уроці.",
        "explain_call": "{call_full}. Це не кнопка «купи» — це рішення, що ціна буде вищою до строку. Без структури вгору — не тисни.",
        "explain_put": "{put_full}. Рішення, що ціна буде нижчою до строку. Без структури вниз — не тисни.",
        "explain_wait": "{wait_full}. Немає зони, немає закріплення, пилка — це теж рішення. Часто сильніше за вхід.",
        "fallback": "Не розжовую ринок у чаті. Відкрий академію — там графік, сценарій і розбір.",
        "menu_hint": "Кнопка «Academy» зліва внизу або велика кнопка вище.",
        "disclaimer": "⚠️ Торгівля пов'язана з високим ризиком і може призвести до втрати всіх коштів. Матеріали академії — навчання, не інвестиційна рекомендація.",
    },
    "ar": {
        "choose": "أنا فولتشوك. اختر اللغة قبل الدخول — وسأرشدك بها.",
        "hello": "المعرفة اليوم — الحرية غداً.\n\nأنا لا أرمي إشارات في الدردشة. على الرسم البياني ثلاثة قرارات فقط:\n• {call}\n• {put}\n• {wait}\n\nشرط الدخول واحد — الاشتراك في القناة الرئيسية للأكاديمية. اشترك وافتح الأكاديمية — أنا بالداخل.",
        "open": "الدخول إلى الأكاديمية",
        "trade": "ComfortTrade",
        "channel": "الاشتراك في القناة",
        "more": "المزيد من الذئب",
        "hint": "باختصار، كما في الدرس:\n• لا بنية — {wait}\n• {call} — فقط مع بنية صاعدة\n• {put} — فقط مع بنية هابطة\n• لون الشمعة ≠ الاتجاه\n\nافتح الأكاديمية وأنجز الوحدة 1.",
        "kb_app": "الأكاديمية",
        "kb_hint": "تلميح",
        "kb_lang": "اللغة", "kb_quote": "اقتباس اليوم", "check_sub": "التحقق من الاشتراك ✅", "sub_ok": "أرى الاشتراك — الوصول مفتوح. ادخل إلى الأكاديمية.", "sub_no": "لا أرى الاشتراك بعد. اشترك في القناة واضغط «التحقق من الاشتراك» مجدداً.", "help": "الأوامر:\n/start — البدء\n/academy — فتح الأكاديمية\n/quote — اقتباس اليوم\n/hint — تلميح\n/lang — اللغة\n\nأي سؤال عن التداول — أجيب كمرشد. لا أعطي إشارات.", "thinking": "فولتشوك يفكّر…", "quote_cap": "🐺 {q}\n\n— فولتشوك · VOVCHOK ACADEMY", "ai_off": "المرشد غير متاح الآن. افتح الأكاديمية — هناك تحليل في كل درس.",
        "explain_call": "{call_full}. ليس زر «اشترِ» — بل قرار أن السعر سيكون أعلى عند الانتهاء. بلا بنية صاعدة — لا تضغط.",
        "explain_put": "{put_full}. قرار أن السعر سيكون أدنى عند الانتهاء. بلا بنية هابطة — لا تضغط.",
        "explain_wait": "{wait_full}. لا منطقة، لا تثبيت، تذبذب — هذا قرار أيضاً. غالباً أقوى من الدخول.",
        "fallback": "لا أشرح السوق في الدردشة. افتح الأكاديمية — هناك الرسم والسيناريو والتحليل.",
        "menu_hint": "زر «Academy» في الأسفل يساراً أو الزر الكبير أعلاه.",
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


def reply_kb(lang: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup([
        [KeyboardButton(tx(lang, "kb_app"))],
        [KeyboardButton(lb(lang, "call")), KeyboardButton(lb(lang, "put")), KeyboardButton(lb(lang, "wait"))],
        [KeyboardButton(tx(lang, "kb_hint")), KeyboardButton(tx(lang, "kb_quote")), KeyboardButton(tx(lang, "kb_lang"))],
    ], resize_keyboard=True)


def user_lang(update: Update, context: ContextTypes.DEFAULT_TYPE) -> str:
    lang = context.user_data.get("lang")
    if lang in LANGS:
        return lang
    code = (update.effective_user.language_code or "ru")[:2] if update.effective_user else "ru"
    return code if code in LANGS else "ru"


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message:
        return
    lang = user_lang(update, context)
    await update.message.reply_text("🐺  VOVCHOK ACADEMY\n\n" + tx(lang, "choose"), reply_markup=lang_kb())


async def send_hello(msg, lang: str) -> None:
    await msg.reply_text("🐺 " + tx(lang, "hello") + "\n\n" + tx(lang, "disclaimer"), reply_markup=app_kb(lang))
    await msg.reply_text(tx(lang, "menu_hint"), reply_markup=reply_kb(lang))


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
        await update.message.reply_text("🐺 " + tx(lang, "help"), reply_markup=app_kb(lang))


async def on_error(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    log.exception("bot error: %s", context.error)


async def on_cb(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    q = update.callback_query
    if not q or not q.data:
        return
    await q.answer()
    kind, _, lang = q.data.partition(":")
    lang = lang if lang in LANGS else "ru"
    if kind == "lang":
        context.user_data["lang"] = lang
        if q.message:
            await send_hello(q.message, lang)
    elif kind == "sub" and q.message:
        ok = await is_subscribed(context.bot, q.from_user.id)
        await q.message.reply_text("🐺 " + tx(lang, "sub_ok" if ok else "sub_no"), reply_markup=app_kb(lang))
    elif kind == "hint" and q.message:
        await q.message.reply_text("🐺\n\n" + tx(lang, "hint"), reply_markup=app_kb(lang))


async def send_quote(msg, lang: str) -> None:
    if not mentor or not mentor.KEY:
        return await msg.reply_text("🐺 " + tx(lang, "ai_off"))
    await msg.chat.send_action("upload_photo")
    try:
        q, img = await mentor.quote_card(lang)
        cap = tx(lang, "quote_cap").format(q=q)
        if img:
            await msg.reply_photo(photo=img, caption=cap)
        else:
            await msg.reply_text(cap)
    except Exception as e:  # noqa: BLE001
        log.warning("quote failed: %s", e)
        await msg.reply_text("🐺 " + tx(lang, "ai_off"))


async def mentor_answer(msg, lang: str, question: str) -> None:
    if not mentor or not mentor.KEY:
        return await msg.reply_text("🐺 " + tx(lang, "fallback"), reply_markup=app_kb(lang))
    await msg.chat.send_action("typing")
    try:
        answer = await mentor.ask(lang, question, session=f"tg-{msg.chat_id}")
        await msg.reply_text("🐺 " + answer, reply_markup=app_kb(lang))
    except Exception as e:  # noqa: BLE001
        log.warning("mentor failed: %s", e)
        await msg.reply_text("🐺 " + tx(lang, "ai_off"), reply_markup=app_kb(lang))


async def on_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.message.text:
        return
    lang = user_lang(update, context)
    text = update.message.text.strip()
    # Любой язык клавиатуры: ищем совпадение метки в любом словаре, чтобы не терять тапы после смены языка.
    for l in LANGS:
        if text == tx(l, "kb_app") or text in ("Academy", "/academy"):
            return await send_hello(update.message, lang)
        if text == tx(l, "kb_hint") or text == "/hint":
            return await update.message.reply_text("🐺\n\n" + tx(lang, "hint"), reply_markup=app_kb(lang))
        if text == tx(l, "kb_lang") or text == "/lang":
            return await update.message.reply_text(tx(lang, "choose"), reply_markup=lang_kb())
        if text == tx(l, "kb_quote") or text == "/quote":
            return await send_quote(update.message, lang)
        for kind in ("call", "put", "wait"):
            if text == lb(l, kind):
                return await update.message.reply_text("🐺 " + tx(lang, "explain_" + kind), reply_markup=app_kb(lang))
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
