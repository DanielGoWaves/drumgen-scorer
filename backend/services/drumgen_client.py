from __future__ import annotations

import asyncio
import os
from typing import Any, Dict, Optional

import httpx


DRUMGEN_BASE_URL = os.getenv("DRUMGEN_BASE_URL", "https://dev-onla-drumgen-demo.waves.com")
REQUEST_TIMEOUT = float(os.getenv("DRUMGEN_TIMEOUT", "30"))
MAX_RETRIES = int(os.getenv("DRUMGEN_MAX_RETRIES", "3"))


class DrumGenClient:
    """Async client for the internal DrumGen demo endpoints."""

    def __init__(self, base_url: str = DRUMGEN_BASE_URL) -> None:
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=REQUEST_TIMEOUT, verify=False)

    async def _request(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        last_exc: Optional[Exception] = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                resp = await self.client.request(method, url, **kwargs)
                resp.raise_for_status()
                return resp
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                if attempt == MAX_RETRIES:
                    raise
                await asyncio.sleep(1 * attempt)
        if last_exc:
            raise last_exc
        raise RuntimeError("Unexpected request failure without exception.")

    async def process_text(self, text: str, model_version: str = "v12") -> Dict[str, Any]:
        url = f"{self.base_url}/process_text"
        resp = await self._request("POST", url, json={"text": text, "model_version": model_version})
        return resp.json()

    async def generate_audio(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.base_url}/generate"
        resp = await self._request("POST", url, json=payload)
        return resp.json()

    async def fetch_audio(self, audio_id: str) -> bytes:
        url = f"{self.base_url}/audio/{audio_id}"
        resp = await self._request("GET", url)
        return resp.content

    async def close(self) -> None:
        await self.client.aclose()

