from pathlib import Path
import hashlib
import pytest
from auditkit import canonicalize, client_signable

OBJ = {
    "b": [1, 2.5, 1e21, 1e-7, 123456789012345680000.0, -0.0, 0.1, 100, 1.5e300, 5e-324],
    "a": {"é": 1, "€": 2, "\U0001F600": 3, "z": "\x01\"\\\n\x7f "},
    "\U0001F600": None, "A": True, "10": 1, "9": 2,
}


def test_matches_ts_canonicalize():
    expected = (Path(__file__).parent / "jcs_expected.txt").read_text(encoding="utf-8")
    assert canonicalize(OBJ).encode() == expected.encode()


def test_nan_rejected():
    with pytest.raises(TypeError):
        canonicalize(float("nan"))


def test_client_signable_shape():
    c = '{"action":"a","actor":"u","occurred_at":"t","target":null,"tenant":"x"}'
    assert client_signable("x", "u", "a", None, "t") == hashlib.sha256(c.encode()).hexdigest()
