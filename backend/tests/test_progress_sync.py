"""Iteration 7 — Progress sync backend tests.

Covers /api/progress/sync, /api/progress/reset, /api/progress/{uid}:
- Web uid ('web:*') accepted; bare uid without 'web:' prefix → 400.
- Merge rules: max(xp), max(streak), max(days); done/practice/ach unions; history≤500.
- init_data with invalid signature + web uid → still works as web user (verified:false).
- GET returns state; unknown uid → 404.
- Reset zeroes state on server; subsequent GET returns empty state (uid stays present).
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_BACKEND_URL", "https://vovchok-mini.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _uid():
    return f"web:test-{uuid.uuid4().hex[:12]}"


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- validation ----------
class TestSyncValidation:
    def test_bare_uid_rejected(self, client):
        r = client.post(f"{API}/progress/sync", json={"uid": "abc123", "state": {}})
        assert r.status_code == 400, r.text

    def test_missing_uid_rejected(self, client):
        # no uid, no init_data → 400 from _resolve_user
        r = client.post(f"{API}/progress/sync", json={"state": {}})
        assert r.status_code == 400, r.text

    def test_too_long_uid_rejected(self, client):
        r = client.post(f"{API}/progress/sync", json={"uid": "web:" + "x" * 100, "state": {}})
        assert r.status_code == 400, r.text

    def test_web_uid_accepted(self, client):
        u = _uid()
        r = client.post(f"{API}/progress/sync", json={"uid": u, "state": {"xp": 10}})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["uid"] == u
        assert d["verified"] is False
        assert d["state"]["xp"] == 10


# ---------- invalid init_data still works as web ----------
class TestInvalidInitData:
    def test_bad_signature_falls_through_to_web(self, client):
        u = _uid()
        payload = {
            "uid": u,
            "init_data": "query_id=AAA&user=%7B%22id%22%3A1%7D&auth_date=0&hash=deadbeef",
            "state": {"xp": 5},
        }
        r = client.post(f"{API}/progress/sync", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["uid"] == u, d
        assert d["verified"] is False


# ---------- merge semantics ----------
class TestMergeSemantics:
    def test_max_xp_streak_days(self, client):
        u = _uid()
        # first push: xp 50, streak 2, days 3
        r1 = client.post(f"{API}/progress/sync", json={"uid": u, "state": {"xp": 50, "streak": 2, "days": 3, "updatedAt": 1000}})
        assert r1.status_code == 200
        assert r1.json()["state"]["xp"] == 50

        # second push: xp 30 (lower) → server should keep 50; streak 5 (higher) → keep 5
        r2 = client.post(f"{API}/progress/sync", json={"uid": u, "state": {"xp": 30, "streak": 5, "days": 1, "updatedAt": 2000}})
        assert r2.status_code == 200
        st = r2.json()["state"]
        assert st["xp"] == 50, st
        assert st["streak"] == 5, st
        assert st["days"] == 3, st

    def test_done_and_ach_union(self, client):
        u = _uid()
        client.post(f"{API}/progress/sync", json={"uid": u, "state": {"done": {"m1l1": 111}, "ach": {"first_step": 222}}})
        r = client.post(f"{API}/progress/sync", json={"uid": u, "state": {"done": {"m1l2": 333}, "ach": {"streak3": 444}}})
        st = r.json()["state"]
        assert st["done"] == {"m1l1": 111, "m1l2": 333}, st["done"]
        assert st["ach"] == {"first_step": 222, "streak3": 444}, st["ach"]

    def test_practice_or_ok(self, client):
        u = _uid()
        client.post(f"{API}/progress/sync", json={"uid": u, "state": {"practice": {"p1": {"ok": False, "at": 100}}}})
        r = client.post(f"{API}/progress/sync", json={"uid": u, "state": {"practice": {"p1": {"ok": True, "at": 200}}}})
        p = r.json()["state"]["practice"]["p1"]
        assert p["ok"] is True and p["at"] == 200, p

    def test_history_capped_at_500(self, client):
        u = _uid()
        big = [{"id": f"q{i}", "ok": True, "cat": "context", "at": i} for i in range(600)]
        r = client.post(f"{API}/progress/sync", json={"uid": u, "state": {"history": big}})
        h = r.json()["state"]["history"]
        assert len(h) == 500, len(h)
        # keeps most recent (largest 'at')
        assert h[-1]["at"] == 599, h[-1]
        assert h[0]["at"] == 100, h[0]

    def test_response_shape(self, client):
        u = _uid()
        r = client.post(f"{API}/progress/sync", json={"uid": u, "state": {"xp": 1}})
        d = r.json()
        assert set(d.keys()) >= {"uid", "verified", "state"}, d
        assert d["verified"] is False


# ---------- GET + reset ----------
class TestGetAndReset:
    def test_get_unknown_404(self, client):
        r = client.get(f"{API}/progress/web:does-not-exist-{uuid.uuid4().hex[:8]}")
        assert r.status_code == 404, r.text

    def test_get_returns_state(self, client):
        u = _uid()
        client.post(f"{API}/progress/sync", json={"uid": u, "state": {"xp": 77, "streak": 3}})
        r = client.get(f"{API}/progress/{u}")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["uid"] == u
        assert d["state"]["xp"] == 77
        assert d["state"]["streak"] == 3
        assert "last_seen" in d

    def test_reset_empties_state(self, client):
        u = _uid()
        client.post(f"{API}/progress/sync", json={"uid": u, "state": {"xp": 999, "done": {"m1l1": 1}}})
        r = client.post(f"{API}/progress/reset", json={"uid": u})
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True

        g = client.get(f"{API}/progress/{u}")
        assert g.status_code == 200, g.text
        assert g.json()["state"] == {}, g.json()

    def test_reset_bad_uid_400(self, client):
        r = client.post(f"{API}/progress/reset", json={"uid": "no-prefix"})
        assert r.status_code == 400, r.text


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
