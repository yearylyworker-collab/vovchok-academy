"""Локальные проверки без Telegram: сценарий презентации, напоминания, слияние прогресса."""
import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, "/app/bot")
sys.path.insert(0, "/app/backend")

import bot as botmod  # noqa: E402
import reminders  # noqa: E402
import sync_store  # noqa: E402

CALLS = []


class FakeBot:
    async def send_chat_action(self, chat_id, action):
        CALLS.append(("action", action))

    async def send_photo(self, chat_id, photo, caption=None, parse_mode=None, reply_markup=None):
        name = getattr(photo, "name", str(photo))
        assert caption and len(caption) <= 1024, f"caption too long: {len(caption or '')}"
        CALLS.append(("photo", Path(name).name, len(caption)))
        return SimpleNamespace(photo=[SimpleNamespace(file_id="fid-" + Path(name).name)])

    async def send_message(self, chat_id, text, parse_mode=None, reply_markup=None):
        assert text and len(text) <= 4096
        CALLS.append(("msg", len(text), bool(reply_markup)))
        return SimpleNamespace()


async def main():
    botmod.PAUSE = 0
    for lang in ("ru", "uk", "ar"):
        CALLS.clear()
        ctx = SimpleNamespace(bot=FakeBot(), bot_data={})
        await botmod.present(ctx, 1, lang)
        photos = [c for c in CALLS if c[0] == "photo"]
        assert len(photos) == 5, photos
        print(lang, "present ok:", [p[1] for p in photos])
        # тексты и кнопки
        kb = botmod.app_kb(lang)
        for row in kb.inline_keyboard:
            for b in row:
                assert any(ord(ch) > 0x2100 for ch in b.text), f"no emoji in button: {b.text}"
    # напоминания
    for lang in ("ru", "uk", "ar"):
        m = reminders.message_for(lang, {"xp": 120, "done": {"a": 1, "b": 2}}, 1)
        assert "120" in m and "2" in m, m
        print(lang, "reminder ok:", m.split("\n")[0][:60])
    # слияние
    merged = sync_store.merge_state({"xp": 50, "done": {"a": 5}}, {"xp": 20, "done": {"b": 7}, "updatedAt": 9})
    assert merged["xp"] == 50 and merged["done"] == {"a": 5, "b": 7}, merged
    assert sync_store.verify_init_data("query_id=x&hash=deadbeef", "123:abc") is None
    print("merge + initData guard ok")


asyncio.run(main())
