import base64
import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from auditkit_sdk import AuditKit, AuditKitError, client_signable, verify_client_sig, verify_receipt


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
    er = ak.erase(r["id"])
    assert er["erased"] is True and er["audit"]["tenant"] == "acme"
    assert ak.get(er["audit"]["id"])["action"] == "payload.erased"
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
    with pytest.raises(AuditKitError) as e:
        ak.log("signed", "u", "x.unregistered")
    assert e.value.status == 400
    spki = key.public_key().public_bytes(Encoding.DER, PublicFormat.SubjectPublicKeyInfo)
    kid = ak.register_tenant_key("signed", spki)["id"]
    assert kid in [k["id"] for k in ak.list_tenant_keys("signed")]
    ak.set_tenant_policy("signed", True)
    with pytest.raises(AuditKitError):
        AuditKit(server["key"], base_url=server["url"]).log("signed", "u", "unsigned")
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
    ak.revoke_tenant_key("signed", kid)
    assert ak.list_tenant_keys("signed")[0]["revoked_at"]


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


def test_receipt_verify_network_and_surrogate(server, kit):
    from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
    import json as _j, urllib.request as _u

    r = kit.log("acme", "u_v", "p.check", payload={"a": 1})
    meta = _j.load(_u.urlopen(server["url"] + "/.well-known/auditkit.json"))
    pub = next(v for k, v in meta.items() if isinstance(v, str) and "public" in k.lower())
    assert verify_receipt(r, pub, "u_v", "p.check", payload={"a": 1})
    assert not verify_receipt(r, pub, "u_v", "p.check", payload={"a": 2})
    assert not verify_receipt(r, pub, "evil", "p.check")
    assert verify_receipt(r, pub, "u_v", "p.check")

    sk = Ed25519PrivateKey.generate()
    sig = base64.b64encode(sk.sign(bytes.fromhex(client_signable("t", "a", "b", None, "2026-01-01T00:00:00.000Z")))).decode()
    assert verify_client_sig(sk.public_key(), sig, "t", "a", "b", None, "2026-01-01T00:00:00.000Z")
    assert not verify_client_sig(sk.public_key(), sig, "t", "x", "b", None, "2026-01-01T00:00:00.000Z")

    with pytest.raises(ValueError, match="surrogate"):
        client_signable("t", "\ud800", "b", None, "x")

    with pytest.raises(AuditKitError) as ei:
        AuditKit("k", base_url="http://127.0.0.1:1", max_attempts=2, retry_delay=0.001).get("x")
    assert ei.value.status == 0 and ei.value.code == "network"
