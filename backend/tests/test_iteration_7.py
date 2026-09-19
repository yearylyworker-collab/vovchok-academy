"""Iteration 7 — Vovchok Academy backend + Mini App relocation verification.

Covers:
- /api/ Hello World
- /api/mentor/ask (Russian answer, ≤40s)
- Static Mini App at /api/miniapp/ with all referenced ?v=v4 assets
- Bot module sanity (APP_URL, app_url, labels, tx, app_kb keyboard)
- Bot live (Telegram getMe / getWebhookInfo)
- Repo hygiene (docs/.nojekyll, bot/.gitignore, no committed .env, workflow copies from docs)
- node tools/check-i18n.js exits 0
"""
import os
import re
import subprocess
import sys
from pathlib import Path

import pytest
import requests

BASE_URL = os.environ.get("EXPO_BACKEND_URL", "https://vovchok-mini.preview.emergentagent.com").rstrip("/")
MINIAPP_URL = f"{BASE_URL}/api/miniapp/"
ROOT = Path("/app")


# ---------- backend API ----------
class TestBackendAPI:
    def test_root_hello_world(self):
        r = requests.get(f"{BASE_URL}/api/", timeout=15)
        assert r.status_code == 200, r.text
        assert r.json() == {"message": "Hello World"}

    def test_mentor_ask_ru(self):
        payload = {"lang": "ru", "question": "Что такое зона поддержки?"}
        r = requests.post(f"{BASE_URL}/api/mentor/ask", json=payload, timeout=45)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "answer" in data and isinstance(data["answer"], str)
        assert len(data["answer"]) > 20
        # crude Russian check — Cyrillic letters present
        assert re.search(r"[А-Яа-яЁё]", data["answer"]), f"Not Russian: {data['answer'][:200]}"


# ---------- static Mini App ----------
class TestMiniAppStatic:
    def test_index_200(self):
        r = requests.get(MINIAPP_URL, timeout=15)
        assert r.status_code == 200
        assert "<html" in r.text.lower()
        self.__class__._html = r.text

    def test_all_assets_200(self):
        html = getattr(self.__class__, "_html", None) or requests.get(MINIAPP_URL, timeout=15).text
        # collect same-origin src/href with ?v=v4
        refs = re.findall(r'(?:src|href)="([^"]+\?v=v4)"', html)
        assert refs, "No ?v=v4 assets found in index.html"
        failed = []
        for ref in refs:
            url = MINIAPP_URL + ref
            rr = requests.get(url, timeout=15)
            if rr.status_code != 200:
                failed.append((ref, rr.status_code))
        assert not failed, f"Non-200 assets: {failed}"


# ---------- bot module sanity ----------
class TestBotModule:
    def test_bot_import_and_labels(self):
        code = (
            "import sys; sys.path.insert(0, '/app/bot');\n"
            "import bot;\n"
            "print('APP_URL=' + bot.APP_URL);\n"
            "print('APP_URL_UK=' + bot.app_url('uk'));\n"
            "print('AR_CALL=' + bot.LABELS['ar']['call']);\n"
            "print('HELP_RU=' + bot.tx('ru','help')[:30]);\n"
            "kb = bot.app_kb('ru').inline_keyboard;\n"
            "print('KB=' + '|'.join(b.text for row in kb for b in row));\n"
        )
        env = os.environ.copy()
        r = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, cwd="/app/bot", env=env, timeout=30)
        assert r.returncode == 0, f"stderr={r.stderr}\nstdout={r.stdout}"
        out = r.stdout
        assert "APP_URL=https://vovchok-mini.preview.emergentagent.com/api/miniapp" in out, out
        assert "APP_URL_UK=" in out and "lang=uk" in out and "v=v4" in out, out
        assert "AR_CALL=صعود" in out, out
        assert "HELP_RU=" in out and len(out.split("HELP_RU=", 1)[1].strip()) > 0, out
        # keyboard buttons — no 'Проверить подписку' since CHANNEL_ID empty
        kb_line = [line for line in out.splitlines() if line.startswith("KB=")][0]
        buttons = kb_line[3:].split("|")
        expected = ["Подписаться на канал", "Войти в академию", "ComfortTrade", "Ещё от волка"]
        for e in expected:
            assert e in buttons, f"Missing '{e}' in {buttons}"
        assert "Проверить подписку" not in buttons, f"Unexpected 'Проверить подписку' in {buttons}"


# ---------- bot live ----------
class TestBotLive:
    def test_backend_log_polling_started(self):
        # concat backend supervisor logs
        logs = ""
        for p in ["/var/log/supervisor/backend.out.log", "/var/log/supervisor/backend.err.log"]:
            try:
                logs += Path(p).read_text(errors="ignore")
            except FileNotFoundError:
                pass
        assert "Telegram bot polling started" in logs, "Polling start line not found in backend logs"

    def test_telegram_get_me(self):
        # read token from backend/.env
        env = Path("/app/backend/.env").read_text()
        m = re.search(r"^BOT_TOKEN=(.+)$", env, re.M)
        assert m, "BOT_TOKEN not in /app/backend/.env"
        token = m.group(1).strip()
        r = requests.get(f"https://api.telegram.org/bot{token}/getMe", timeout=15)
        assert r.status_code == 200 and r.json().get("ok") is True, r.text

    def test_telegram_webhook_empty(self):
        env = Path("/app/backend/.env").read_text()
        token = re.search(r"^BOT_TOKEN=(.+)$", env, re.M).group(1).strip()
        r = requests.get(f"https://api.telegram.org/bot{token}/getWebhookInfo", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j.get("ok") is True, j
        # polling mode → webhook url must be empty
        assert j["result"].get("url", "") == "", f"Unexpected webhook URL: {j['result']}"


# ---------- repo hygiene ----------
class TestRepoHygiene:
    def test_workflow_copies_from_docs(self):
        wf = (ROOT / ".github/workflows/pages.yml").read_text()
        assert "find docs" in wf, "workflow does not copy from docs/"

    def test_nojekyll_in_docs(self):
        assert (ROOT / "docs/.nojekyll").exists()

    def test_bot_gitignore_env(self):
        assert ".env" in (ROOT / "bot/.gitignore").read_text()

    def test_no_committed_env(self):
        for bad in [ROOT / "docs/.env", ROOT / "bot/.env"]:
            assert not bad.exists(), f"Committed env should not exist: {bad}"
        # .env.example is OK
        assert (ROOT / "bot/.env.example").exists()

    def test_check_i18n_exits_zero(self):
        r = subprocess.run(["node", "tools/check-i18n.js"], cwd="/app/docs", capture_output=True, text=True, timeout=30)
        assert r.returncode == 0, f"stderr={r.stderr}\nstdout={r.stdout}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
