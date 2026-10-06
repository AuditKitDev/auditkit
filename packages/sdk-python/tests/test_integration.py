import base64
import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from auditkit import AuditKit, AuditKitError, client_signable


@pytest.fixture
def kit(server):
    return AuditKit(server["key"], base_url=server["url"])


def test_full_flow(server, kit):
    got = []
    ak = AuditKit(server["key"], base_url=server["url"], keep_receipts=got.append)
    r = ak.log("acme", "u_1", "invoice.delete", target="inv_42", payload={"n": 1})
    assert r["position"] == 0 and len(r["event_hash"]) == 64 and got == [r]
    dup = ak.log("acme", "u_1", "invoice.delete", idempotency_key="k1")
    again = ak.log("acme", "u_1", "invoice.delete", idempotency_key="k1")
    assert again["id"] == dup["id"] and again.get("duplicate")
    bulk = ak.log_bulk([{"tenant": "acme", "actor": "u_2", "action": "a.b"}, {"tenant": "acme", "actor": "u_3", "action": "a.c", "target": "t"}])
    assert [x["position"] for x in bulk] == [2, 3]

    ev = ak.get(r["id"])
    assert ev["actor"] == "u_1" and ev["payload"] == {"n": 1}
    res = ak.search(tenant="acme", actor="u_2")
    assert [e["actor"] for e in res["events"]] == ["u_2"]
    assert len(ak.search(tenant="acme", limit=2)["events"]) == 2
    assert "events" in ak.search(tenant="acme", from_="2000-01-01T00:00:00Z", to="2100-01-01T00:00:00Z")
    assert isinstance(ak.proof(r["id"]), dict)
    v = ak.verify("acme")
    assert v["valid"] is True and v["count"] == 4
    assert ak.verify("acme", from_=1, to=2)["valid"] is True
    lines = list(ak.export("acme"))
    assert lines and all("type" in l for l in lines)
    assert any(t["external_id"] == "acme" and t["events"] == 4 for t in ak.tenants())
    assert ak.erase(r["id"]) == {"erased": True}
    assert ak.get(r["id"])["erased"] is True


def test_error(kit):
    with pytest.raises(AuditKitError) as e:
        kit.get("nope")
    assert e.value.status == 404
    bad = AuditKit("ak_bad", base_url=kit._base)
    with pytest.raises(AuditKitError) as e:
        bad.tenants()
    assert e.value.status == 401


def test_client_sig_roundtrip(server):
    key = Ed25519PrivateKey.generate()
    got = []
    ak = AuditKit(server["key"], base_url=server["url"], client_key=key, keep_receipts=got.append)
    ak.log("signed", "u", "x.y", target="t1", occurred_at="2026-01-02T03:04:05.000Z")
    ak.log("signed", "u", "x.z")
    assert ak.verify("signed")["valid"]
    lines = [l for l in ak.export("signed") if l.get("type") == "event"] or []
    sigs = [(json.dumps(l)) for l in lines]
    pub = key.public_key()
    found = 0
    for l in lines:
        ev = l.get("event", l)
        if ev.get("client_sig"):
            pub.verify(base64.b64decode(ev["client_sig"]), bytes.fromhex(client_signable("signed", ev["actor"], ev["action"], ev.get("target"), ev["occurred_at"])))
            found += 1
    assert found == 2, sigs


def test_retry_on_5xx():
    calls = []

    class H(BaseHTTPRequestHandler):
        def do_POST(self):
            calls.append(self.headers["idempotency-key"])
            self.rfile.read(int(self.headers["content-length"]))
            if len(calls) < 3:
                self.send_response(503 if len(calls) == 1 else 429)
                self.end_headers()
                self.wfile.write(b"{}")
            else:
                self.send_response(201)
                self.end_headers()
                self.wfile.write(b'{"id":"e","position":1}')

        def log_message(self, *a):
            pass

    s = HTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    ak = AuditKit("k", base_url=f"http://127.0.0.1:{s.server_port}", retry_delay=0.01)
    assert ak.log("t", "a", "b")["id"] == "e"
    assert len(calls) == 3 and len(set(calls)) == 1 and len(calls[0]) == 36
    s.shutdown()
