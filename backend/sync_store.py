"""Серверный прогресс ученика: проверка Telegram initData + слияние состояний (устройство ↔ сервер)."""
import hashlib
import hmac
import json
from urllib.parse import parse_qsl

KEYS = ("done", "practice", "history", "xp", "streak", "lastDay", "days", "ach", "last", "lastStep", "updatedAt")


def verify_init_data(init_data: str, token: str) -> dict | None:
    """Проверяет подпись Telegram WebApp initData. Возвращает данные пользователя или None."""
    if not init_data or not token:
        return None
    try:
        pairs = dict(parse_qsl(init_data, keep_blank_values=True))
        got = pairs.pop("hash", "")
        if not got:
            return None
        dcs = "\n".join(f"{k}={pairs[k]}" for k in sorted(pairs))
        secret = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
        calc = hmac.new(secret, dcs.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(calc, got):
            return None
        user = json.loads(pairs.get("user") or "{}")
        if not user.get("id"):
            return None
        return {"id": int(user["id"]), "lang": (user.get("language_code") or "")[:2], "name": user.get("first_name") or ""}
    except Exception:  # noqa: BLE001
        return None


def _merge_stamps(a: dict | None, b: dict | None) -> dict:
    """Объединение словарей id -> timestamp: берём самую раннюю отметку."""
    out = dict(a or {})
    for k, v in (b or {}).items():
        cur = out.get(k)
        out[k] = min(cur, v) if isinstance(cur, (int, float)) and isinstance(v, (int, float)) else (cur or v)
    return out


def _merge_practice(a: dict | None, b: dict | None) -> dict:
    out = {k: dict(v) for k, v in (a or {}).items() if isinstance(v, dict)}
    for k, v in (b or {}).items():
        if not isinstance(v, dict):
            continue
        cur = out.get(k)
        if not cur:
            out[k] = dict(v)
        else:
            out[k] = {"ok": bool(cur.get("ok")) or bool(v.get("ok")), "at": max(cur.get("at") or 0, v.get("at") or 0)}
    return out


def _merge_history(a: list | None, b: list | None) -> list:
    seen, out = set(), []
    for h in sorted([*(a or []), *(b or [])], key=lambda x: x.get("at") or 0):
        if not isinstance(h, dict):
            continue
        key = (h.get("id"), h.get("at"))
        if key in seen:
            continue
        seen.add(key)
        out.append(h)
    return out[-500:]


def merge_state(server: dict | None, client: dict | None) -> dict:
    """Слияние без потерь: уроки/практика/достижения объединяются, XP и серия — максимум."""
    s, c = server or {}, client or {}
    newer = c if (c.get("updatedAt") or 0) >= (s.get("updatedAt") or 0) else s
    return {
        "done": _merge_stamps(s.get("done"), c.get("done")),
        "practice": _merge_practice(s.get("practice"), c.get("practice")),
        "history": _merge_history(s.get("history"), c.get("history")),
        "xp": max(int(s.get("xp") or 0), int(c.get("xp") or 0)),
        "streak": max(int(s.get("streak") or 0), int(c.get("streak") or 0)),
        "lastDay": max(s.get("lastDay") or "", c.get("lastDay") or "") or None,
        "days": max(int(s.get("days") or 0), int(c.get("days") or 0)),
        "ach": _merge_stamps(s.get("ach"), c.get("ach")),
        "last": newer.get("last"),
        "lastStep": newer.get("lastStep") or 0,
        "updatedAt": max(int(s.get("updatedAt") or 0), int(c.get("updatedAt") or 0)),
    }
