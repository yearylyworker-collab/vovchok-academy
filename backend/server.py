from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# ---------- Волчок-наставник (Claude) + бот в фоне ----------
import sys, asyncio  # noqa: E402
sys.path.insert(0, str(ROOT_DIR.parent / "bot"))
import mentor  # noqa: E402
from pydantic import BaseModel as _BM  # noqa: E402
from fastapi import HTTPException  # noqa: E402


class AskIn(_BM):
    lang: str = "ru"
    question: str
    session: str | None = None


class ExplainIn(_BM):
    lang: str = "ru"
    scenario: str
    chosen: str
    correct: str
    base_explain: str = ""
    task_id: str | None = None
    session: str | None = None


async def _log_mentor(kind: str, payload: dict, answer: str):
    await db.mentor_messages.insert_one({"kind": kind, **payload, "answer": answer, "at": datetime.now(timezone.utc).isoformat()})


@api_router.post("/mentor/ask")
async def mentor_ask(body: AskIn):
    if not mentor.KEY:
        raise HTTPException(503, "mentor disabled")
    lang = body.lang if body.lang in ("ru", "uk", "ar") else "ru"
    answer = await mentor.ask(lang, body.question, body.session)
    await _log_mentor("ask", {"lang": lang, "question": body.question[:1500], "session": body.session}, answer)
    return {"answer": answer}


@api_router.post("/mentor/explain")
async def mentor_explain(body: ExplainIn):
    if not mentor.KEY:
        raise HTTPException(503, "mentor disabled")
    lang = body.lang if body.lang in ("ru", "uk", "ar") else "ru"
    answer = await mentor.explain(lang, body.scenario, body.chosen, body.correct, body.base_explain, body.session)
    await _log_mentor("explain", {"lang": lang, "task_id": body.task_id, "chosen": body.chosen, "correct": body.correct, "session": body.session}, answer)
    return {"answer": answer}


_bot_app = None


@app.on_event("startup")
async def _start_bot():
    """Запускаем Telegram-бота (polling) внутри backend, если RUN_BOT=1 и задан BOT_TOKEN."""
    global _bot_app
    if os.environ.get("RUN_BOT") != "1" or not os.environ.get("BOT_TOKEN"):
        return
    try:
        import bot  # noqa: E402
        from telegram import Update as _U
        _bot_app = bot.build_application()
        await _bot_app.initialize(); await bot.post_init(_bot_app); await _bot_app.start()
        await _bot_app.updater.start_polling(allowed_updates=_U.ALL_TYPES, drop_pending_updates=True)
        logger.info("Telegram bot polling started")
    except Exception as e:  # noqa: BLE001
        logger.warning("bot not started: %s", e)


@app.on_event("shutdown")
async def _stop_bot():
    if _bot_app:
        try:
            await _bot_app.updater.stop(); await _bot_app.stop(); await _bot_app.shutdown()
        except Exception:  # noqa: BLE001
            pass


# Include the router in the main app (после всех маршрутов)
app.include_router(api_router)

# Preview of the static Telegram Mini App (source of truth: /app/miniapp, deployed to GitHub Pages)
from fastapi.staticfiles import StaticFiles  # noqa: E402
app.mount("/api/miniapp", StaticFiles(directory=str(ROOT_DIR.parent / "docs"), html=True), name="miniapp")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
