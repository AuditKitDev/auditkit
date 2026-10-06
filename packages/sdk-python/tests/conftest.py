import os, socket, subprocess, tempfile, time
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
                         stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    keyfile = Path(tmp) / "first-admin-key.txt"
    deadline = time.time() + 30
    while time.time() < deadline and not (keyfile.exists() and keyfile.read_text().strip()):
        if p.poll() is not None:
            raise RuntimeError("server exited")
        time.sleep(0.1)
    if not keyfile.exists():
        p.kill()
        raise RuntimeError("server did not write first-admin-key.txt")
    key = keyfile.read_text().strip()
    deadline = time.time() + 30
    while time.time() < deadline:
        try:
            socket.create_connection(("127.0.0.1", port), 0.2).close()
            break
        except OSError:
            time.sleep(0.1)
    yield {"url": f"http://127.0.0.1:{port}", "key": key}
    p.terminate()
    p.wait(10)
