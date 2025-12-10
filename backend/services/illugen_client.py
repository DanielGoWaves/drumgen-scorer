from __future__ import annotations

import asyncio
import os
from typing import Any, Dict, List, Optional

import httpx

ILLUGEN_BASE_URL = os.getenv(
    "ILLUGEN_BASE_URL", "https://dev-onla-samplemaker-server.waves.com"
)
REQUEST_TIMEOUT = float(os.getenv("ILLUGEN_TIMEOUT", "30"))
MAX_RETRIES = int(os.getenv("ILLUGEN_MAX_RETRIES", "3"))
ILLUGEN_COOKIE = os.getenv("ILLUGEN_COOKIE")


class IllugenClient:
    """Async client for Illugen demo generation."""

    def __init__(self, base_url: str = ILLUGEN_BASE_URL) -> None:
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

    async def generate(
        self,
        prompt: str,
        sfx_type: str = "one-shot",
        item_id: int = 2,
        user_guid: str = "demo-user",
    ) -> Dict[str, Any]:
        """Send prompt to Illugen and return parsed JSON."""
        url = f"{self.base_url}/generate-demo"
        payload = {
          "prompt": prompt,
          "sfxType": sfx_type,
          "itemId": item_id,
          "userGuid": user_guid,
        }
        headers = {"Cookie": ILLUGEN_COOKIE} if ILLUGEN_COOKIE else None
        resp = await self._request("POST", url, json=payload, headers=headers)
        return resp.json()

    async def download_file(self, url: str) -> bytes:
        headers = {"Cookie": ILLUGEN_COOKIE} if ILLUGEN_COOKIE else None
        resp = await self._request("GET", url, headers=headers)
        return resp.content

    async def close(self) -> None:
        await self.client.aclose()
