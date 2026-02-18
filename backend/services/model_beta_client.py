from __future__ import annotations

import os
from typing import Any, Dict, Tuple

import httpx


MODEL_BETA_URL = os.getenv("MODEL_BETA_URL", "http://127.0.0.1:8001")
MODEL_BETA_TIMEOUT = float(os.getenv("MODEL_BETA_TIMEOUT", "120"))


class ModelBetaClient:
    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = (base_url or MODEL_BETA_URL).rstrip("/")
        self.client = httpx.AsyncClient(timeout=MODEL_BETA_TIMEOUT)

    async def get_schema(self) -> Dict[str, Any]:
        resp = await self.client.get(f"{self.base_url}/schema")
        resp.raise_for_status()
        return resp.json()

    async def generate_audio(self, payload: Dict[str, Any]) -> Tuple[bytes, str | None]:
        resp = await self.client.post(f"{self.base_url}/generate", json=payload)
        resp.raise_for_status()
        return resp.content, resp.headers.get("X-Sample-Rate")

    async def get_health(self) -> Dict[str, Any]:
        resp = await self.client.get(f"{self.base_url}/health")
        resp.raise_for_status()
        return resp.json()

    async def close(self) -> None:
        await self.client.aclose()
