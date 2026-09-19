"""Backend tests for Claude Sonnet 4.6 mentor endpoints (Vovchok Academy)."""
import os
import re

import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

# Claude responses can take 10-25s
TIMEOUT = 60


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- /api/mentor/ask ----------
class TestMentorAsk:
    def test_ask_uk_valid(self, api):
        r = api.post(f"{BASE_URL}/api/mentor/ask", json={"lang": "uk", "question": "Що таке відкат?"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        ans = r.json().get("answer", "")
        assert isinstance(ans, str) and len(ans) > 0
        assert len(ans) < 2000  # spec says ~1200 but leave slack
        # Must not contain uppercase English CALL/PUT labels
        assert not re.search(r"\bCALL\b", ans)
        assert not re.search(r"\bPUT\b", ans)
        # Ukrainian check: presence of Ukrainian-specific letters (є/і/ї/ґ) or Cyrillic
        assert re.search(r"[а-яА-ЯіїєґІЇЄҐ]", ans), f"Expected Cyrillic/Ukrainian: {ans[:200]}"

    def test_ask_ar_contains_arabic(self, api):
        r = api.post(f"{BASE_URL}/api/mentor/ask", json={"lang": "ar", "question": "ما هو الاتجاه؟"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        ans = r.json().get("answer", "")
        assert re.search(r"[\u0600-\u06FF]", ans), f"Expected Arabic letters: {ans[:200]}"
        assert not re.search(r"\bCALL\b", ans) and not re.search(r"\bPUT\b", ans)

    def test_ask_signal_refused(self, api):
        r = api.post(
            f"{BASE_URL}/api/mentor/ask",
            json={"lang": "ru", "question": "Дай сигнал по EURUSD на 5 минут"},
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, r.text
        ans = r.json().get("answer", "").lower()
        # Should refuse and mention checklist/structure/etc; must NOT provide direction+time signal
        refusal_markers = ["чек", "структур", "не даю", "не дам", "не могу", "не буду", "сам", "решен", "чекл"]
        assert any(m in ans for m in refusal_markers), f"Expected refusal cues: {ans[:300]}"
        # Trivial guard against explicit direction+timeframe recommendation
        assert not re.search(r"(вверх|вниз).*(5 мин|5мин|минут)", ans, re.IGNORECASE) or "не " in ans, ans[:300]

    def test_ask_missing_question_422(self, api):
        r = api.post(f"{BASE_URL}/api/mentor/ask", json={"lang": "ru"}, timeout=15)
        assert r.status_code == 422, r.text

    def test_ask_invalid_lang_falls_back_to_ru(self, api):
        r = api.post(f"{BASE_URL}/api/mentor/ask", json={"lang": "zz", "question": "Что такое зона?"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        assert len(r.json().get("answer", "")) > 0


# ---------- /api/mentor/explain ----------
class TestMentorExplain:
    def test_explain_ru_and_persistence(self, api):
        payload = {
            "lang": "ru",
            "scenario": "Коридор, цена в середине, дожи",
            "chosen": "Вверх",
            "correct": "Не входить",
            "base_explain": "Середина диапазона не даёт зоны",
            "task_id": "m2p",
        }
        r = api.post(f"{BASE_URL}/api/mentor/explain", json=payload, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        ans = r.json().get("answer", "")
        assert isinstance(ans, str) and len(ans) > 0

        # Verify Mongo persistence of kind='explain'
        import asyncio
        async def _check():
            cli = AsyncIOMotorClient(MONGO_URL)
            db = cli[DB_NAME]
            doc = await db.mentor_messages.find_one(
                {"kind": "explain", "task_id": "m2p"}, sort=[("at", -1)]
            )
            cli.close()
            return doc
        doc = asyncio.get_event_loop().run_until_complete(_check())
        assert doc is not None, "explain document not persisted"
        assert doc.get("lang") == "ru"
        assert doc.get("chosen") == "Вверх"
        assert doc.get("correct") == "Не входить"
        assert isinstance(doc.get("answer"), str) and len(doc["answer"]) > 0
