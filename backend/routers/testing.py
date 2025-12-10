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
from ..models import IllugenGeneration, Prompt
from ..services.drumgen_client import DrumGenClient
from ..services.illugen_client import IllugenClient

router = APIRouter()

# Audio files directory
AUDIO_DIR = Path("./audio_files")
AUDIO_DIR.mkdir(exist_ok=True)

ILLUGEN_AUDIO_DIR = Path("./illugen_audio")
ILLUGEN_AUDIO_DIR.mkdir(exist_ok=True)


class SendPromptRequest(BaseModel):
    prompt_id: Optional[int] = None
    text: Optional[str] = None
    temperature: float = 1.0
    stereo_width: float = 0.5
    model_version: str = "v11"
    generation_mode: str = "generate"
    illugen: bool = False
    illugen_sfx_type: str = "one-shot"


class SendPromptResponse(BaseModel):
    prompt_id: Optional[int]
    prompt_text: str
    difficulty: Optional[int] = None
    llm_controls: dict[str, Any]
    llm_response: str
    audio_id: str
    audio_url: str
    drum_type: Optional[str] = None
    illugen_generation_id: Optional[int] = None
    illugen_variations: Optional[list[dict[str, Any]]] = None
    illugen_error: Optional[str] = None


async def get_client() -> DrumGenClient:
    client = DrumGenClient()
    try:
        yield client
    finally:
        await client.close()


async def get_illugen_client() -> IllugenClient:
    client = IllugenClient()
    try:
        yield client
    finally:
        await client.close()


@router.post("/send-prompt", response_model=SendPromptResponse, summary="Send prompt to DrumGen")
async def send_prompt(
    payload: SendPromptRequest,
    session: AsyncSession = Depends(get_session),
    client: DrumGenClient = Depends(get_client),
    illugen_client: IllugenClient = Depends(get_illugen_client),
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
    llm_data = await client.process_text(prompt_text, payload.model_version)
    if not llm_data.get("success"):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM error: {llm_data.get('error')}")
    controls = llm_data.get("controls") or {}
    
    # Extract drum type from LLM controls
    drum_type = None
    for key in ['Kind', 'kind', 'KIND']:
        if key in controls:
            drum_type = str(controls[key]).strip()
            break

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
    
    audio_url = f"/api/audio/{audio_id}"  # Relative URL - frontend will add base
    difficulty_val = prompt_obj.difficulty if prompt_obj else None

    illugen_variations: list[dict[str, Any]] = []
    illugen_generation_id: Optional[int] = None
    illugen_error: Optional[str] = None

    if payload.illugen:
        try:
            illugen_resp = await illugen_client.generate(prompt_text, payload.illugen_sfx_type)
            request_id = illugen_resp.get("requestId") or illugen_resp.get("id")
            variations = illugen_resp.get("variations") or []
            if not request_id or not variations:
                illugen_error = "Illugen response missing requestId or variations"
            else:
                target_dir = ILLUGEN_AUDIO_DIR / request_id
                target_dir.mkdir(parents=True, exist_ok=True)
                for var in variations:
                    url = var.get("url")
                    variation_id = var.get("variationId") or var.get("id")
                    if not url or not variation_id:
                        continue
                    try:
                        content = await illugen_client.download_file(url)
                        filename = f"{variation_id}.wav"
                        out_path = target_dir / filename
                        out_path.write_bytes(content)
                        illugen_variations.append(
                            {
                                "variation_id": variation_id,
                                "order_index": var.get("orderIndex"),
                                "serve_path": f"/api/illugen/audio/{request_id}/{filename}",
                                "local_path": str(out_path),
                                "source_url": url,
                                "title": illugen_resp.get("title"),
                                "sfx_type": illugen_resp.get("sfxType") or payload.illugen_sfx_type,
                                "request_id": request_id,
                            }
                        )
                    except Exception as download_exc:  # noqa: BLE001
                        illugen_error = f"Failed to download variation {variation_id}: {download_exc}"

                illugen_entry = IllugenGeneration(
                    request_id=request_id,
                    prompt_text=prompt_text,
                    sfx_type=payload.illugen_sfx_type,
                    variations={"items": illugen_variations},
                )
                session.add(illugen_entry)
                await session.commit()
                await session.refresh(illugen_entry)
                illugen_generation_id = illugen_entry.id
        except Exception as exc:  # noqa: BLE001
            illugen_error = f"Illugen generation failed: {exc}"

    # For free text, we don't create the prompt yet - user will tag it when scoring
    return SendPromptResponse(
        prompt_id=prompt_id,  # Will be None for free text
        prompt_text=prompt_text,
        difficulty=difficulty_val,
        llm_controls=controls,
        llm_response=llm_data.get("llm_response", ""),
        audio_id=audio_id,
        audio_url=audio_url,
        drum_type=drum_type,
        illugen_generation_id=illugen_generation_id,
        illugen_variations=illugen_variations if illugen_variations else None,
        illugen_error=illugen_error,
    )

