"""RFC 8785 JSON Canonicalization Scheme (matches @auditkit/core canonicalize)."""
from __future__ import annotations

import json
import math
from typing import Any


def _number(v: float) -> str:
    if v != v or v in (math.inf, -math.inf):
        raise TypeError("JCS: non-finite number")
    if v == 0:
        return "0"
    if v < 0:
        return "-" + _number(-v)
    # Shortest round-trip digits from repr, re-formatted per ES Number::toString.
    r = repr(v)
    mant, _, exp = r.partition("e")
    ip, _, fp = mant.partition(".")
    if fp == "0":
        fp = ""
    digits = (ip + fp).lstrip("0")
    point = len(ip) + (int(exp) if exp else 0)  # decimal point position relative to ip+fp
    if ip.strip("0") == "":  # 0.000ddd
        point -= len(ip + fp) - len((ip + fp).lstrip("0"))
    digits = digits.rstrip("0")
    k, n = len(digits), point
    if k <= n <= 21:
        return digits + "0" * (n - k)
    if 0 < n <= 21:
        return digits[:n] + "." + digits[n:]
    if -6 < n <= 0:
        return "0." + "0" * (-n) + digits
    e = n - 1
    sign = "+" if e >= 0 else "-"
    body = digits[0] + ("." + digits[1:] if k > 1 else "")
    return f"{body}e{sign}{abs(e)}"


def canonicalize(value: Any) -> str:
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, int):
        return _number(float(value)) if abs(value) > 2**53 else str(value)
    if isinstance(value, float):
        return _number(value)
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(canonicalize(v) for v in value) + "]"
    if isinstance(value, dict):
        keys = sorted(value, key=lambda k: k.encode("utf-16-be", "surrogatepass"))
        return "{" + ",".join(json.dumps(k, ensure_ascii=False) + ":" + canonicalize(value[k]) for k in keys) + "}"
    raise TypeError(f"JCS: unsupported type {type(value).__name__}")
