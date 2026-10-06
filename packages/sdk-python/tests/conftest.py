import os, re, socket, subprocess, tempfile, time
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parents[3]


@pytest.fixture(scope="session")
def server():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    tmp = tempfile.mkdtemp()
    env = {**os.environ, "AUDITKIT_DATA": tmp, "PORT": str(port), "AUDITKIT_ANCHORS": "none"}
    p = subprocess.Popen(["node", str(ROOT / "packages/server/dist/main.js")], env=env, cwd=ROOT,
                         stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    key = None
    out = ""
    deadline = time.time() + 30
    while time.time() < deadline:
        line = p.stdout.readline()
        out += line
        m = re.search(r"admin key \(shown once\): (\S+)", line)
        if m:
            key = m.group(1)
        if "listening" in line:
            break
    if not key:
        p.kill()
        raise RuntimeError("server did not start: " + out)
    yield {"url": f"http://127.0.0.1:{port}", "key": key}
    p.terminate()
    p.wait(10)
