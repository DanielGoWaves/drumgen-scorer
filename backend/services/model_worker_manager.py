from __future__ import annotations

import os
import socket
import subprocess
import sys
from pathlib import Path
from typing import Any
_WORKER_PROCESS: subprocess.Popen[Any] | None = None


def _is_port_open(host: str, port: int) -> bool:
    try:
        with socket.create_connection((host, port), timeout=0.3):
            return True
    except OSError:
        return False


def _resolve_worker_command() -> tuple[list[str], Path]:
    project_root = Path(__file__).resolve().parents[2]
    model_root = Path(os.environ.get("DRUMGEN_MODEL_ROOT", str(Path.home() / "Desktop" / "V18_Acoustic+Electronic")))
    onnx_dir = model_root / "onnx_exports" / "acoustic"
    python_bin = os.environ.get("MODEL_PYTHON_BIN", sys.executable)

    cmd = [
        python_bin,
        str(project_root / "backend" / "model_beta_worker.py"),
        "--model-root",
        str(model_root),
        "--onnx-dir",
        str(onnx_dir),
        "--host",
        "127.0.0.1",
        "--port",
        "8001",
    ]
    return cmd, project_root


def ensure_model_worker_started() -> dict[str, Any]:
    global _WORKER_PROCESS

    if _is_port_open("127.0.0.1", 8001):
        return {"status": "already_running"}

    cmd, cwd = _resolve_worker_command()
    _WORKER_PROCESS = subprocess.Popen(
        cmd,
        cwd=str(cwd),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return {"status": "started", "pid": _WORKER_PROCESS.pid}


def stop_model_worker() -> None:
    global _WORKER_PROCESS
    if _WORKER_PROCESS is None:
        return
    try:
        _WORKER_PROCESS.terminate()
    except Exception:
        pass
    finally:
        _WORKER_PROCESS = None
