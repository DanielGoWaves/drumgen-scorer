from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, HTTPException, Response

from backend.services.model_beta_client import ModelBetaClient


router = APIRouter()
client = ModelBetaClient()


@router.get("/health")
async def health() -> Dict[str, Any]:
    try:
        return await client.get_health()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Model Beta worker unavailable: {exc}") from exc


@router.get("/schema")
async def schema() -> Dict[str, Any]:
    try:
        return await client.get_schema()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Model Beta worker unavailable: {exc}") from exc


@router.post("/generate")
async def generate(payload: Dict[str, Any]) -> Response:
    try:
        audio_bytes, sample_rate = await client.generate_audio(payload)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Model Beta worker error: {exc}") from exc

    headers = {}
    if sample_rate:
        headers["X-Sample-Rate"] = sample_rate
    return Response(content=audio_bytes, media_type="audio/wav", headers=headers)
