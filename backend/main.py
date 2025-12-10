from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from backend.database import Base, engine
from backend.routers import prompts, results, testing


app = FastAPI(title="DrumGen Scorer API")

# Basic CORS setup (adjust origins in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def init_models() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.on_event("startup")
async def on_startup() -> None:
    await init_models()


# Routers
app.include_router(prompts.router, prefix="/api/prompts", tags=["prompts"])
app.include_router(testing.router, prefix="/api/test", tags=["testing"])
app.include_router(results.router, prefix="/api/results", tags=["results"])


# Audio file serving endpoint
@app.get("/api/audio/{audio_id}")
async def serve_audio(audio_id: str):
    """Serve locally stored audio files."""
    audio_path = Path(f"./audio_files/{audio_id}.wav")
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(audio_path, media_type="audio/wav")


@app.get("/health")
async def health_root() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/health")
async def health_api() -> dict[str, str]:
    # Mirror the root health endpoint for frontend/API checks
    return {"status": "ok"}

