from __future__ import annotations

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models import Prompt
from ..services.drumgen_client import DrumGenClient

router = APIRouter()

# Audio files directory
AUDIO_DIR = Path("./audio_files")
AUDIO_DIR.mkdir(exist_ok=True)


class SendPromptRequest(BaseModel):
    prompt_id: Optional[int] = None
    text: Optional[str] = None
    temperature: float = 1.0
    stereo_width: float = 0.5
    model_version: str = "v11"
    generation_mode: str = "generate"


class SendPromptResponse(BaseModel):
    prompt_id: Optional[int]
    prompt_text: str
    difficulty: Optional[int] = None
    llm_controls: dict[str, Any]
    llm_response: str
    audio_id: str
    audio_url: str


async def get_client() -> DrumGenClient:
    client = DrumGenClient()
    try:
        yield client
    finally:
        await client.close()


@router.post("/send-prompt", response_model=SendPromptResponse, summary="Send prompt to DrumGen")
async def send_prompt(
    payload: SendPromptRequest,
    session: AsyncSession = Depends(get_session),
    client: DrumGenClient = Depends(get_client),
) -> SendPromptResponse:
    prompt_text = payload.text
    prompt_id: Optional[int] = payload.prompt_id
    is_free_text = prompt_id is None

    prompt_obj: Optional[Prompt] = None
    if prompt_id:
        result = await session.execute(select(Prompt).where(Prompt.id == prompt_id))
        prompt_obj = result.scalar_one_or_none()
        if not prompt_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt not found")
        prompt_text = prompt_obj.text
        prompt_obj.used_count += 1
        await session.commit()
    if not prompt_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide prompt_id or text.")

    # Step 1: process text to JSON controls
    llm_data = await client.process_text(prompt_text)
    if not llm_data.get("success"):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM error: {llm_data.get('error')}")
    controls = llm_data.get("controls") or {}

    # Step 2: generate audio
    gen_payload = {
        "text_labels": controls,
        "condition_values": {},
        "temperature": payload.temperature,
        "stereo_width": payload.stereo_width,
        "generation_mode": payload.generation_mode,
        "model_version": payload.model_version,
    }
    gen_data = await client.generate_audio(gen_payload)
    if not gen_data.get("success"):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Generate error: {gen_data.get('error')}")

    audio_id = gen_data.get("audio_id")
    if not audio_id:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Missing audio_id in response.")

    # Download and save audio file locally
    audio_content = await client.fetch_audio(audio_id)
    audio_filename = f"{audio_id}.wav"
    audio_file_path = AUDIO_DIR / audio_filename
    
    with open(audio_file_path, "wb") as f:
        f.write(audio_content)
    
    audio_url = f"http://localhost:8000/api/audio/{audio_id}"  # Full local URL for frontend
    difficulty_val = prompt_obj.difficulty if prompt_obj else None

    # For free text, we don't create the prompt yet - user will tag it when scoring
    return SendPromptResponse(
        prompt_id=prompt_id,  # Will be None for free text
        prompt_text=prompt_text,
        difficulty=difficulty_val,
        llm_controls=controls,
        llm_response=llm_data.get("llm_response", ""),
        audio_id=audio_id,
        audio_url=audio_url,
    )

