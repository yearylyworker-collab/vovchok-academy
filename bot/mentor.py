"""Волчок-наставник: Claude Sonnet 4.6 (вопросы + разбор практики) и Nano Banana (мотивационные карточки). Ключ — EMERGENT_LLM_KEY."""
import base64
import json
import os
import re
import uuid
from pathlib import Path

from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv(Path(__file__).with_name(".env"))
load_dotenv(Path(__file__).resolve().parent.parent / "backend" / ".env")
KEY = os.environ.get("EMERGENT_LLM_KEY", "")
LANG_NAME = {"ru": "русском", "uk": "украинском", "ar": "арабском"}


def _labels(lang: str) -> dict:
    src = (Path(__file__).resolve().parent.parent / "docs" / "trade-labels.js").read_text(encoding="utf-8")
    data = json.loads(src[src.index("{"): src.rindex("}") + 1])
    return data.get(lang) or data["ru"]


def system_prompt(lang: str) -> str:
    lb = _labels(lang)
    return (
        "Ты — Волчок, наставник VOVCHOK ACADEMY (школа трейдинга бинарных опционов). "
        f"Отвечай ТОЛЬКО на {LANG_NAME.get(lang, 'русском')} языке, коротко (до 120 слов), по делу, в тоне спокойного опытного наставника. "
        "Учишь читать структуру: тренд старшего таймфрейма → зона → подтверждающая свеча → срок. "
        f"Три решения на графике называй только так: «{lb['call']}», «{lb['put']}», «{lb['wait']}». Никогда не используй CALL/PUT/WAIT. "
        "СТРОГО ЗАПРЕЩЕНО: давать сигналы, прогнозы по конкретным активам и времени, обещать доход, советовать сумму ставки. "
        "Если просят сигнал — откажись и объясни, как принять решение самому по чеклисту. "
        "Напоминай о рисках, когда уместно. Без markdown-заголовков, допустимы короткие списки."
    )


def _chat(lang: str, session: str) -> LlmChat:
    return LlmChat(api_key=KEY, session_id=session, system_message=system_prompt(lang)).with_model("anthropic", "claude-sonnet-4-6")


async def ask(lang: str, question: str, session: str | None = None) -> str:
    """Свободный вопрос ученика."""
    chat = _chat(lang, session or f"ask-{uuid.uuid4()}")
    return (await chat.send_message(UserMessage(text=question[:1500]))).strip()


async def explain(lang: str, scenario: str, chosen: str, correct: str, base_explain: str, session: str | None = None) -> str:
    """Персональный разбор ошибки в практике."""
    ok = chosen.strip().lower() == correct.strip().lower()
    prompt = (
        f"Сценарий практики: {scenario}\nУченик выбрал: {chosen}. Верный ответ: {correct}. "
        f"Базовый разбор академии: {base_explain}\n"
        + ("Ответ верный. Похвали коротко и назови, какие части контекста ученик собрал правильно, и на что смотреть в следующий раз."
           if ok else "Ответ неверный. Объясни персонально, какая логическая ошибка привела к этому выбору, и какой вопрос чеклиста нужно было задать. Без нотаций.")
    )
    chat = _chat(lang, session or f"explain-{uuid.uuid4()}")
    return (await chat.send_message(UserMessage(text=prompt))).strip()


QUOTE_STYLE = ("Cinematic dark premium poster, deep navy night city with moon, majestic wolf mentor with glowing cyan eyes and blue rim light, "
               "neon cyan accents, glassmorphism, no text, no letters, vertical 4:5 composition, high detail")


async def quote_card(lang: str) -> tuple[str, bytes | None]:
    """Мотивационная карточка: текст цитаты от Claude + изображение Nano Banana."""
    quote = await ask(lang, "Придумай одну короткую (до 12 слов) мотивирующую цитату для ученика трейдинга про дисциплину, терпение или обучение. Только цитата, без кавычек и подписи.", f"quote-{uuid.uuid4()}")
    img = LlmChat(api_key=KEY, session_id=f"img-{uuid.uuid4()}", system_message="You are an image generator").with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    _, images = await img.send_message_multimodal_response(UserMessage(text=QUOTE_STYLE))
    data = base64.b64decode(images[0]["data"]) if images else None
    return re.sub(r"^[«\"']|[»\"']$", "", quote), data
