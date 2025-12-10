from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from sqlalchemy import text

from backend.database import Base, engine, async_session_maker
from backend.routers import prompts, results, testing
from backend.services.audio_cleanup import cleanup_all_orphaned_audio


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

    # Ensure new nullable columns exist when running against an existing DB (SQLite)
    async with engine.begin() as conn:
        # Check columns for test_results table
        result = await conn.execute(text("PRAGMA table_info('test_results')"))
        columns = [row[1] for row in result.fetchall()]
        if "notes_audio_path" not in columns:
            await conn.execute(text("ALTER TABLE test_results ADD COLUMN notes_audio_path TEXT"))
        if "illugen_generation_id" not in columns:
            await conn.execute(text("ALTER TABLE test_results ADD COLUMN illugen_generation_id INTEGER"))
        if "illugen_attachments" not in columns:
            await conn.execute(text("ALTER TABLE test_results ADD COLUMN illugen_attachments JSON"))


@app.on_event("startup")
async def on_startup() -> None:
    await init_models()
    
    # Clean up orphaned audio files on startup
    async with async_session_maker() as session:
        deleted_count = await cleanup_all_orphaned_audio(session)
        if deleted_count > 0:
            print(f"🧹 Cleaned up {deleted_count} orphaned audio file(s) on startup")


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


@app.get("/api/illugen/audio/{request_id}/{filename}")
async def serve_illugen_audio(request_id: str, filename: str):
    """Serve locally stored Illugen audio files."""
    audio_path = Path(f"./illugen_audio/{request_id}/{filename}")
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Illugen audio file not found")
    return FileResponse(audio_path, media_type="audio/wav")


@app.get("/health")
async def health_root() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/health")
async def health_api() -> dict[str, str]:
    # Mirror the root health endpoint for frontend/API checks
    return {"status": "ok"}

