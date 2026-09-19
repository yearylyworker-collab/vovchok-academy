"""Напоминания Волчка: если ученик не заходил 2+ дня — мотивационное сообщение (фиксированные тексты, без расхода AI-ключа)."""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

log = logging.getLogger("vovchok.reminders")

IDLE_DAYS = 2
INTERVAL_SEC = 1800  # как часто проверяем очередь
BATCH = 200

TEXTS = {
    "ru": [
        "🐺 Два дня тишины на графике — и рука уже забывает структуру.\nУ тебя {xp} XP и {done} уроков за спиной. Вернись на 5 минут: один сценарий в практике — и глаз снова острый.",
        "🐺 Рынок не ждёт настроения. Он ждёт подготовленных.\nТвоя серия остывает — один урок сегодня снова её разожжёт. {xp} XP уже твои, не бросай на полпути.",
        "🐺 Дисциплина — это не «когда хочется», а «когда договорился с собой».\nЗайди в академию: одно задание в Practice Lab, и день уже не пустой.",
        "🐺 Пока ты не смотришь на график — кто-то учится читать его лучше тебя.\n{done} уроков пройдено. Следующий ждёт ровно там, где ты остановился.",
    ],
    "uk": [
        "🐺 Два дні тишини на графіку — і рука вже забуває структуру.\nУ тебе {xp} XP і {done} уроків за плечима. Повернись на 5 хвилин: один сценарій у практиці — і око знову гостре.",
        "🐺 Ринок не чекає настрою. Він чекає підготовлених.\nТвоя серія холоне — один урок сьогодні знову її розпалить. {xp} XP вже твої, не кидай на півдорозі.",
        "🐺 Дисципліна — це не «коли хочеться», а «коли домовився із собою».\nЗайди в академію: одне завдання в Practice Lab, і день уже не порожній.",
        "🐺 Поки ти не дивишся на графік — хтось вчиться читати його краще за тебе.\n{done} уроків пройдено. Наступний чекає саме там, де ти зупинився.",
    ],
    "ar": [
        "🐺 يومان من الصمت أمام الرسم البياني — واليد تنسى البنية.\nلديك {xp} XP و{done} دروس. ارجع 5 دقائق: سيناريو واحد في التدريب — وتعود العين حادة.",
        "🐺 السوق لا ينتظر المزاج، بل ينتظر المستعدّين.\nسلسلتك تبرد — درس واحد اليوم يعيد إشعالها. {xp} XP لك بالفعل، لا تتوقف في النصف.",
        "🐺 الانضباط ليس «عندما أرغب»، بل «عندما أتفق مع نفسي».\nافتح الأكاديمية: تمرين واحد في Practice Lab، ولن يكون يومك فارغاً.",
        "🐺 بينما أنت بعيد عن الرسم — شخص آخر يتعلّم قراءته أفضل منك.\n{done} دروس أنجزت. التالي ينتظرك حيث توقفت بالضبط.",
    ],
}


def _kb(lang: str):
    from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
    import bot as botmod
    return InlineKeyboardMarkup([[InlineKeyboardButton(botmod.tx(lang, "open"), web_app=WebAppInfo(url=botmod.app_url(lang)))]])


def message_for(lang: str, state: dict | None, n: int) -> str:
    pool = TEXTS.get(lang) or TEXTS["ru"]
    st = state or {}
    done = len([k for k in (st.get("done") or {})])
    return pool[n % len(pool)].format(xp=int(st.get("xp") or 0), done=done)


async def _tick(bot, db) -> int:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=IDLE_DAYS)
    q = {
        "chat_id": {"$exists": True, "$ne": None},
        "last_seen": {"$lt": cutoff},
        "$or": [{"last_remind": {"$exists": False}}, {"last_remind": None}, {"last_remind": {"$lt": cutoff}}],
    }
    sent = 0
    async for doc in db.progress.find(q).limit(BATCH):
        lang = doc.get("lang") if doc.get("lang") in ("ru", "uk", "ar") else "ru"
        n = int(doc.get("remind_count") or 0)
        try:
            await bot.send_message(doc["chat_id"], message_for(lang, doc.get("state"), n), reply_markup=_kb(lang))
            sent += 1
        except Exception as e:  # noqa: BLE001
            log.warning("reminder to %s failed: %s", doc.get("chat_id"), e)
            await db.progress.update_one({"_id": doc["_id"]}, {"$set": {"last_remind": now, "remind_error": str(e)[:200]}})
            continue
        await db.progress.update_one({"_id": doc["_id"]}, {"$set": {"last_remind": now}, "$inc": {"remind_count": 1}})
    if sent:
        log.info("reminders sent: %s", sent)
    return sent


async def reminder_loop(bot, db) -> None:
    await asyncio.sleep(20)  # даём боту подняться
    while True:
        try:
            await _tick(bot, db)
        except asyncio.CancelledError:
            raise
        except Exception as e:  # noqa: BLE001
            log.warning("reminder tick failed: %s", e)
        await asyncio.sleep(INTERVAL_SEC)
