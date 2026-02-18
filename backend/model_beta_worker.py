import argparse
import io
import json
import os
import sys
import threading
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, Tuple
from urllib.parse import urlparse
import uuid

import numpy as np


def resolve_model_root() -> Path:
    env_root = os.getenv("DRUMGEN_MODEL_ROOT")
    if env_root:
        return Path(env_root).expanduser()
    return Path.home() / "Desktop" / "V18_Acoustic+Electronic"


def to_wav_bytes(audio: np.ndarray, sample_rate: int) -> bytes:
    if audio.ndim == 1:
        channels = 1
    else:
        channels = audio.shape[1]

    audio = np.asarray(audio, dtype=np.float32)
    audio = np.clip(audio, -1.0, 1.0)
    audio_int16 = (audio * 32767.0).astype(np.int16)

    with io.BytesIO() as buffer:
        with wave.open(buffer, "wb") as wav_file:
            wav_file.setnchannels(channels)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio_int16.tobytes())
        return buffer.getvalue()


def compute_condition(condition_zero: np.ndarray, slider_values: np.ndarray) -> np.ndarray:
    pos = slider_values >= 0
    condition = np.empty_like(condition_zero, dtype=np.float32)
    condition[pos] = condition_zero[pos] + (1.0 - condition_zero[pos]) * slider_values[pos]
    condition[~pos] = condition_zero[~pos] + condition_zero[~pos] * slider_values[~pos]
    return condition


FALLBACK_CONDITIONING_PARAMS = ["duration", "pitch", "brightness", "texture", "punch"]


class ModelState:
    def __init__(self, model_root: Path, onnx_dir: Path) -> None:
        sys.path.insert(0, str(model_root))

        from drum_synth_onnx import DrumSynthONNX  # type: ignore

        try:
            from conditioning import conditioning_params  # type: ignore
            self.conditioning_params = list(conditioning_params)
        except Exception:
            print("Warning: could not import conditioning module, using fallback params")
            self.conditioning_params = list(FALLBACK_CONDITIONING_PARAMS)
        self.synth = DrumSynthONNX(onnx_dir=str(onnx_dir))
        self.lock = threading.Lock()

        label_dict_path = onnx_dir / "label_dictionaries.json"
        with label_dict_path.open("r", encoding="utf-8") as handle:
            schema = json.load(handle)

        self.label_schema = {
            "dictionaries": schema.get("dictionaries", {}),
            "multi_value_cols": schema.get("multi_value_cols", []),
            "dataset_type": schema.get("dataset_type", "unknown"),
        }

    def generate(self, payload: Dict[str, Any]) -> Tuple[bytes, int]:
        labels = payload.get("labels") or {}
        sliders = payload.get("sliders") or {}
        temperature = float(payload.get("temperature", 1.0))
        width = float(payload.get("width", 0.5))

        slider_values = np.array(
            [float(sliders.get(name, 0.0)) for name in self.conditioning_params],
            dtype=np.float32,
        )
        slider_values = np.clip(slider_values, -1.0, 1.0)
        use_base_audio = np.all(np.isclose(slider_values, 0.0))

        with self.lock:
            mel, audio_base, latent, condition_zero, noise_source = self.synth.generate_drum_stereo(
                condition=None,
                latent=None,
                text=labels,
                temperature=temperature,
                width=width,
                noise_source=None,
            )

            if condition_zero is None:
                condition_zero = np.zeros(len(self.conditioning_params), dtype=np.float32)
            else:
                condition_zero = np.asarray(condition_zero, dtype=np.float32)

            if use_base_audio:
                audio = audio_base
            else:
                condition = compute_condition(condition_zero, slider_values)
                mel, audio, latent, condition_zero, noise_source = self.synth.generate_drum_stereo(
                    condition=condition,
                    latent=None,
                    text=labels,
                    temperature=temperature,
                    width=width,
                    noise_source=noise_source,
                )

        wav_bytes = to_wav_bytes(audio, self.synth.fs)
        return wav_bytes, self.synth.fs


class ModelBetaHandler(BaseHTTPRequestHandler):
    state: ModelState

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _set_headers(self, status: int, content_type: str | None, extra: Dict[str, str] | None = None) -> None:
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        if content_type:
            self.send_header("Content-Type", content_type)
        if extra:
            for key, value in extra.items():
                self.send_header(key, value)
        self.end_headers()

    def do_OPTIONS(self) -> None:
        self._set_headers(204, None)

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/health":
            self._set_headers(200, "application/json")
            self.wfile.write(json.dumps({"status": "ok"}).encode("utf-8"))
            return

        if path == "/schema":
            payload = {
                "conditioning_params": self.state.conditioning_params,
                "label_schema": self.state.label_schema,
            }
            self._set_headers(200, "application/json")
            self.wfile.write(json.dumps(payload).encode("utf-8"))
            return

        self._set_headers(404, "application/json")
        self.wfile.write(json.dumps({"detail": "Not found"}).encode("utf-8"))

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path != "/generate":
            self._set_headers(404, "application/json")
            self.wfile.write(json.dumps({"detail": "Not found"}).encode("utf-8"))
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length) if content_length > 0 else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            self._set_headers(400, "application/json")
            self.wfile.write(json.dumps({"detail": "Invalid JSON"}).encode("utf-8"))
            return

        try:
            wav_bytes, sample_rate = self.state.generate(payload)
        except Exception as exc:  # noqa: BLE001
            self._set_headers(500, "application/json")
            self.wfile.write(json.dumps({"detail": str(exc)}).encode("utf-8"))
            return

        headers = {
            "X-Sample-Rate": str(sample_rate),
            "X-Request-Id": str(uuid.uuid4()),
        }
        self._set_headers(200, "audio/wav", headers)
        self.wfile.write(wav_bytes)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8001)
    parser.add_argument("--model-root", default=None)
    parser.add_argument("--onnx-dir", default=None)
    args = parser.parse_args()

    model_root = Path(args.model_root).expanduser() if args.model_root else resolve_model_root()
    onnx_dir = Path(args.onnx_dir).expanduser() if args.onnx_dir else model_root / "onnx_exports" / "acoustic"

    if not onnx_dir.exists():
        raise SystemExit(f"ONNX directory not found: {onnx_dir}")

    state = ModelState(model_root=model_root, onnx_dir=onnx_dir)
    ModelBetaHandler.state = state

    server = ThreadingHTTPServer((args.host, args.port), ModelBetaHandler)
    print(f"Model Beta worker running on http://{args.host}:{args.port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
