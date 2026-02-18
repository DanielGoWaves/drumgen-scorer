from __future__ import annotations

import json
import os
import random
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import uuid4
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models import ModelTestResult
from ..services.model_beta_client import ModelBetaClient
from ..services.model_worker_manager import ensure_model_worker_started

router = APIRouter()

DB_SOURCES: dict[str, str] = {
    "gold-db": "https://dev-onla-drumgen-demo.waves.com/gold-db",
    "full-db": "https://dev-onla-drumgen-demo.waves.com/full-db",
}

V18_MODEL_ROOT = Path(os.environ.get("DRUMGEN_MODEL_ROOT", str(Path.home() / "Desktop" / "V18_Acoustic+Electronic")))
V18_ONNX_DIR = V18_MODEL_ROOT / "onnx_exports" / "acoustic"
V18_CONDITIONING_PARAMS = ["duration", "pitch", "brightness", "texture", "punch"]
PROJECT_ROOT = Path(__file__).resolve().parents[2]
AUDIO_DIR = PROJECT_ROOT / "audio_files"
AUDIO_DIR.mkdir(exist_ok=True)

MODEL_VERSION = "v18_acoustic"

DRUM_KIND_MAP: dict[str, list[str]] = {
    "bass_drum": ["Bass Drum", "Kick"],
    "snare": ["Snare", "Snare Piccolo", "Snare + Clap"],
    "low_tom": ["Low Tom", "Floor Tom"],
    "mid_tom": ["Mid Tom"],
    "high_tom": ["High Tom", "Hi Tom"],
}


def parse_multi_value(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return [part.strip() for part in str(value).split(",") if part.strip()]


def to_prompt_tags(sample: dict[str, Any]) -> dict[str, Any]:
    excluded = {"audio_url", "dataset"}
    tags: dict[str, Any] = {}
    for key, value in sample.items():
        if key in excluded:
            continue
        if key in {"Genres", "Process", "Free Tags"}:
            tags[key] = parse_multi_value(value)
        else:
            tags[key] = value
    return tags


def normalize_sample_json_for_model(sample: dict[str, Any]) -> dict[str, Any]:
    """Return a JSON-safe sample dict where multi-value fields are always string arrays."""
    normalized = dict(sample)
    for key in ("Genres", "Process", "Free Tags"):
        if key in normalized:
            normalized[key] = parse_multi_value(normalized.get(key))
    return normalized


def classify_drum_type(kind: Optional[str]) -> str:
    normalized = (kind or "").strip().lower()
    if "snare" in normalized:
        return "snare"
    if "kick" in normalized or "bass drum" in normalized:
        return "bass_drum"
    if "floor tom" in normalized or "low tom" in normalized:
        return "low_tom"
    if "mid tom" in normalized:
        return "mid_tom"
    if "high tom" in normalized or "hi tom" in normalized:
        return "high_tom"
    return "other"


def encode_source_dataset(db_source: str, dataset: str) -> str:
    return f"{db_source}|{dataset}"


def decode_source_dataset(dataset: str) -> tuple[Optional[str], str]:
    if "|" not in dataset:
        return None, dataset
    source, raw_dataset = dataset.split("|", 1)
    source = source.strip().lower()
    if source in DB_SOURCES and raw_dataset:
        return source, raw_dataset
    return None, dataset


def build_source_audio_proxy_url(dataset: str, filename: str, db_source: Optional[str] = None) -> str:
    encoded_source, raw_dataset = decode_source_dataset(dataset)
    source = db_source or encoded_source
    base = (
        f"/api/model-testing/source-audio?"
        f"dataset={quote(str(raw_dataset))}&filename={quote(str(filename))}"
    )
    if source:
        return f"{base}&db_source={quote(source)}"
    return base


def _case_insensitive_match(candidate: str, options: list[str]) -> str | None:
    """Return the option that matches candidate (case-insensitive), or None."""
    lower = candidate.lower().strip()
    for opt in options:
        if opt.lower().strip() == lower:
            return opt
    return None


def normalize_tags_for_model(tags: dict[str, Any], schema: dict[str, Any]) -> dict[str, Any]:
    dictionaries = schema.get("label_schema", {}).get("dictionaries", {})
    multi_cols = set(schema.get("label_schema", {}).get("multi_value_cols", []))

    normalized: dict[str, Any] = {}
    for key, options_map in dictionaries.items():
        if key not in tags:
            continue
        options = list((options_map or {}).keys())
        if key == "Velocity":
            options = [opt for opt in options if opt != "quiet"]

        if key in multi_cols:
            input_value = tags.get(key, [])
            values = parse_multi_value(input_value)
            matched = []
            for value in values:
                m = _case_insensitive_match(value, options)
                if m:
                    matched.append(m)
            normalized[key] = matched
            continue

        selected = str(tags.get(key, "")).strip()
        matched = _case_insensitive_match(selected, options)
        if matched:
            normalized[key] = matched

    return normalized


class GenerateModelAudioRequest(BaseModel):
    sample: Dict[str, Any]
    tags: Dict[str, Any]
    sliders: Optional[Dict[str, float]] = None
    temperature: float = 1.0
    width: float = 0.5


class ModelTestResultCreate(BaseModel):
    source_dataset: str
    source_filename: str
    source_kind: Optional[str] = None
    source_audio_url: Optional[str] = None
    source_metadata: Optional[Dict[str, Any]] = None
    applied_tags: Dict[str, Any]
    generated_audio_id: str
    generated_audio_path: str
    score: int = Field(ge=0, le=100)
    notes: Optional[str] = None

    @field_validator("score")
    @classmethod
    def validate_score_step(cls, value: int) -> int:
        if value % 10 != 0:
            raise ValueError("Score must be in steps of 10")
        return value


class ModelTestResultUpdate(BaseModel):
    score: Optional[int] = Field(default=None, ge=0, le=100)
    notes: Optional[str] = None

    @field_validator("score")
    @classmethod
    def validate_score_step(cls, value: Optional[int]) -> Optional[int]:
        if value is not None and value % 10 != 0:
            raise ValueError("Score must be in steps of 10")
        return value


async def fetch_remote_samples(
    target_kinds: list[str],
    limit: Optional[int],
    source_names: Optional[list[str]] = None,
) -> list[dict[str, Any]]:
    async with httpx.AsyncClient(verify=False, timeout=8.0) as client:
        selected_sources = source_names or list(DB_SOURCES.keys())
        samples: list[dict[str, Any]] = []
        seen: set[tuple[str, str, str]] = set()

        for source_name in selected_sources:
            source_base = DB_SOURCES.get(source_name)
            if not source_base:
                continue

            for kind in target_kinds:
                page = 1
                per_page = 200
                # Track consecutive pages with zero usable samples so we
                # don't endlessly paginate through unplayable electronic rows.
                consecutive_empty_pages = 0
                while True:
                    # gold-db uses "acoustic_drums", full-db uses "acoustic"
                    dataset_param = "acoustic_drums" if source_name == "gold-db" else "acoustic"
                    params = {
                        "dataset": dataset_param,
                        "kind": kind,
                        "page": page,
                        "per_page": per_page,
                    }
                    try:
                        response = await client.get(f"{source_base}/api/samples", params=params)
                        response.raise_for_status()
                        payload = response.json()
                        page_samples = payload.get("samples", [])
                    except Exception:  # noqa: BLE001
                        # Keep model testing usable even if one remote source is down/unreachable.
                        break

                    if not page_samples:
                        break

                    page_added = 0
                    for sample in page_samples:
                        # Early filter: skip electronic samples from full-db
                        # (they are not playable and would waste the limit budget).
                        if source_name == "full-db":
                            ds_type = str(sample.get("_dataset") or "").strip().lower()
                            if ds_type == "electronic":
                                continue

                        # Skip samples tagged with velocity "quiet".
                        velocity = str(sample.get("Velocity") or "").strip().lower()
                        if velocity == "quiet":
                            continue

                        dataset = str(sample.get("dataset") or "acoustic_drums")
                        filename = str(sample.get("Filename") or "")
                        if not filename:
                            continue
                        key = (source_name, dataset, filename)
                        if key in seen:
                            continue
                        seen.add(key)
                        samples.append({"sample": sample, "db_source": source_name})
                        page_added += 1
                        if limit is not None and len(samples) >= limit:
                            return samples

                    if page_added == 0:
                        consecutive_empty_pages += 1
                        if consecutive_empty_pages >= 3:
                            # All recent pages contained only unusable samples
                            # for this kind — stop paginating.
                            break
                    else:
                        consecutive_empty_pages = 0

                    if len(page_samples) < per_page:
                        break
                    page += 1

        return samples if limit is None else samples[:limit]


@router.get("/schema")
async def get_schema() -> Dict[str, Any]:
    """Return the V18 acoustic model schema directly from disk (no worker needed)."""
    label_dict_path = V18_ONNX_DIR / "label_dictionaries.json"
    if not label_dict_path.exists():
        raise HTTPException(
            status_code=500,
            detail=f"label_dictionaries.json not found at {label_dict_path}",
        )
    with label_dict_path.open("r", encoding="utf-8") as handle:
        raw = json.load(handle)

    return {
        "conditioning_params": V18_CONDITIONING_PARAMS,
        "label_schema": {
            "dictionaries": raw.get("dictionaries", {}),
            "multi_value_cols": raw.get("multi_value_cols", []),
            "dataset_type": raw.get("dataset_type", "unknown"),
        },
    }


@router.get("/samples")
async def list_samples(
    drum_type: str = Query("bass_drum"),
    limit: Optional[int] = Query(50, ge=1, le=10000),
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    if drum_type not in DRUM_KIND_MAP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"drum_type must be one of: {', '.join(DRUM_KIND_MAP)}",
        )

    existing_rows = await session.execute(
        select(ModelTestResult.source_dataset, ModelTestResult.source_filename)
    )
    scored_keys = {
        (str(dataset), str(filename))
        for dataset, filename in existing_rows.all()
    }

    requested_limit = limit or 50
    async def append_unused_samples(remote_samples: list[dict[str, Any]], current: list[dict[str, Any]]) -> list[dict[str, Any]]:
        samples = list(current)
        for remote_sample in remote_samples:
            sample = remote_sample.get("sample") or {}
            db_source = str(remote_sample.get("db_source") or "gold-db")
            dataset_raw = sample.get("dataset") or "acoustic_drums"
            dataset = encode_source_dataset(db_source, str(dataset_raw))
            filename = sample.get("Filename")
            if not filename:
                continue
            if (str(dataset), str(filename)) in scored_keys:
                continue
            # Backward compatibility: pre-source-tagged gold-db rows used raw dataset only.
            if db_source == "gold-db" and (str(dataset_raw), str(filename)) in scored_keys:
                continue
            # full-db electronic samples are not playable (proxy returns 500 / 404).
            # full-db acoustic samples ARE playable via the gold-db proxy fallback.
            if db_source == "full-db":
                sample_dataset_type = str(sample.get("_dataset") or "").strip().lower()
                if sample_dataset_type == "electronic":
                    continue
            sample_id = f"{dataset}:{filename}"
            if any(existing["id"] == sample_id for existing in samples):
                continue
            kind = sample.get("Kind")
            proxy_url = build_source_audio_proxy_url(str(dataset), str(filename), db_source)
            samples.append(
                {
                    "id": sample_id,
                    "dataset": dataset,
                    "filename": filename,
                    "db_source": db_source,
                    "kind": kind,
                    "drum_type": classify_drum_type(kind),
                    "tags": to_prompt_tags(sample),
                    "source_audio_proxy_url": proxy_url,
                    "source_audio_url": sample.get("audio_url"),
                    "raw_sample": sample,
                    "source_json_for_model": normalize_sample_json_for_model(sample),
                }
            )
            if len(samples) >= requested_limit:
                break
        return samples

    try:
        # Stage 1: fast path from gold-db.
        gold_remote = await fetch_remote_samples(
            DRUM_KIND_MAP[drum_type],
            max(requested_limit * 6, 200),
            source_names=["gold-db"],
        )
        samples = await append_unused_samples(gold_remote, [])

        # Stage 2: only if needed, top up from full-db.
        if len(samples) < requested_limit:
            remaining_needed = requested_limit - len(samples)
            full_remote = await fetch_remote_samples(
                DRUM_KIND_MAP[drum_type],
                max(remaining_needed * 12, 200),
                source_names=["full-db"],
            )
            samples = await append_unused_samples(full_remote, samples)

        # Fallback when kind filtering is inconsistent upstream.
        if not samples:
            all_known_kinds = sorted({kind for kinds in DRUM_KIND_MAP.values() for kind in kinds})
            broad_samples = await fetch_remote_samples(
                all_known_kinds,
                max(requested_limit * 6, 200),
                source_names=["gold-db", "full-db"],
            )
            typed = [
                remote_sample
                for remote_sample in broad_samples
                if classify_drum_type((remote_sample.get("sample") or {}).get("Kind")) == drum_type
            ]
            samples = await append_unused_samples(typed, samples)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Failed to fetch source samples: {exc}") from exc

    random.shuffle(samples)
    selected = samples[:requested_limit]
    remaining_after_return = max(len(samples) - len(selected), 0)
    return {
        "samples": selected,
        "unused_total": len(samples),
        "requested_limit": requested_limit,
        "remaining_after_return": remaining_after_return,
        "depleted": len(samples) == 0,
        "message": (
            f"No unused samples left for {drum_type}."
            if len(samples) == 0
            else None
        ),
    }


@router.get("/source-audio")
async def proxy_source_audio(
    dataset: str,
    filename: str,
    db_source: Optional[str] = Query(None),
) -> Response:
    decoded_source, raw_dataset = decode_source_dataset(dataset)
    requested_source = (db_source or decoded_source or "").strip().lower()
    if requested_source in DB_SOURCES:
        # Always fall back to gold-db for audio (full-db acoustic files are
        # served through the gold-db proxy, since full-db proxy often fails).
        source_order = [requested_source]
        if "gold-db" not in source_order:
            source_order.append("gold-db")
    else:
        source_order = ["gold-db", "full-db"]

    params = {"dataset": raw_dataset, "filename": filename}
    async with httpx.AsyncClient(verify=False, timeout=40.0) as client:
        for source_name in source_order:
            source_base = DB_SOURCES[source_name]
            try:
                response = await client.get(f"{source_base}/api/proxy-audio", params=params)
                if response.status_code == 200:
                    return Response(content=response.content, media_type="audio/wav")
            except Exception:  # noqa: BLE001
                # Source unreachable / timeout — try next source.
                continue
    raise HTTPException(status_code=404, detail="Source audio not found")


def _read_schema_from_disk() -> Dict[str, Any]:
    """Read the V18 acoustic model schema from disk (no worker round-trip)."""
    label_dict_path = V18_ONNX_DIR / "label_dictionaries.json"
    with label_dict_path.open("r", encoding="utf-8") as handle:
        raw = json.load(handle)
    return {
        "conditioning_params": V18_CONDITIONING_PARAMS,
        "label_schema": {
            "dictionaries": raw.get("dictionaries", {}),
            "multi_value_cols": raw.get("multi_value_cols", []),
            "dataset_type": raw.get("dataset_type", "unknown"),
        },
    }


@router.post("/generate")
async def generate_from_tags(payload: GenerateModelAudioRequest) -> Dict[str, Any]:
    schema = _read_schema_from_disk()
    labels = normalize_tags_for_model(payload.tags, schema)
    incoming_sliders = payload.sliders or {}
    model_payload = {
        "labels": labels,
        "sliders": {name: float(incoming_sliders.get(name, 0)) for name in schema.get("conditioning_params", [])},
        "temperature": payload.temperature,
        "width": payload.width,
    }

    client = ModelBetaClient()
    try:
        audio_bytes, _sample_rate = await client.generate_audio(model_payload)
    except Exception as exc:  # noqa: BLE001
        ensure_model_worker_started()
        raise HTTPException(
            status_code=502,
            detail=(
                f"Model generation failed (is the model worker running on port 8001?): {exc}"
            ),
        ) from exc
    finally:
        await client.close()

    audio_id = str(uuid4())
    output_path = AUDIO_DIR / f"{audio_id}.wav"
    output_path.write_bytes(audio_bytes)

    return {
        "audio_id": audio_id,
        "audio_url": f"/api/audio/{audio_id}",
        "audio_file_path": f"audio_files/{audio_id}.wav",
        "applied_tags": labels,
        "model_version": MODEL_VERSION,
    }


@router.post("/results", status_code=status.HTTP_201_CREATED)
async def create_result(payload: ModelTestResultCreate, session: AsyncSession = Depends(get_session)) -> Dict[str, Any]:
    existing = (
        await session.execute(
            select(ModelTestResult).where(
                ModelTestResult.source_dataset == payload.source_dataset,
                ModelTestResult.source_filename == payload.source_filename,
            )
        )
    ).scalar_one_or_none()
    if existing:
        # Idempotent behavior: keep one row per DB sample and return existing id.
        return {"id": existing.id, "already_exists": True}

    row = ModelTestResult(
        source_dataset=payload.source_dataset,
        source_filename=payload.source_filename,
        source_kind=payload.source_kind,
        source_audio_url=payload.source_audio_url,
        source_metadata=payload.source_metadata,
        applied_tags=payload.applied_tags,
        generated_audio_id=payload.generated_audio_id,
        generated_audio_path=payload.generated_audio_path,
        model_version=MODEL_VERSION,
        score=payload.score,
        notes=payload.notes,
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return {"id": row.id}


def serialize_result(row: ModelTestResult) -> dict[str, Any]:
    source_dataset = str(row.source_dataset)
    source_filename = str(row.source_filename)
    return {
        "id": row.id,
        "source_dataset": source_dataset,
        "source_filename": source_filename,
        "source_kind": row.source_kind,
        "source_audio_url": row.source_audio_url,
        "source_audio_proxy_url": build_source_audio_proxy_url(source_dataset, source_filename),
        "source_metadata": row.source_metadata,
        "applied_tags": row.applied_tags,
        "generated_audio_id": row.generated_audio_id,
        "generated_audio_url": f"/api/audio/{row.generated_audio_id}" if row.generated_audio_id else None,
        "generated_audio_path": row.generated_audio_path,
        "model_version": row.model_version,
        "score": row.score,
        "notes": row.notes,
        "tested_at": row.tested_at,
        "drum_type": classify_drum_type(row.source_kind),
    }


@router.get("/results")
async def list_results(
    drum_type: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    query = select(ModelTestResult).order_by(ModelTestResult.tested_at.desc())
    rows = (await session.execute(query)).scalars().all()

    if drum_type:
        normalized_filter = "bass_drum" if drum_type == "kick" else drum_type
        rows = [row for row in rows if classify_drum_type(row.source_kind) == normalized_filter]

    return {"results": [serialize_result(row) for row in rows]}


@router.get("/results/{result_id}")
async def get_result(result_id: int, session: AsyncSession = Depends(get_session)) -> Dict[str, Any]:
    row = await session.get(ModelTestResult, result_id)
    if not row:
        raise HTTPException(status_code=404, detail="Result not found")
    return serialize_result(row)


@router.put("/results/{result_id}")
async def update_result(
    result_id: int,
    payload: ModelTestResultUpdate,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    row = await session.get(ModelTestResult, result_id)
    if not row:
        raise HTTPException(status_code=404, detail="Result not found")

    if payload.score is not None:
        row.score = payload.score
    if payload.notes is not None:
        row.notes = payload.notes

    await session.commit()
    await session.refresh(row)
    return serialize_result(row)


@router.delete("/results/{result_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_result(result_id: int, session: AsyncSession = Depends(get_session)) -> Response:
    row = await session.get(ModelTestResult, result_id)
    if not row:
        raise HTTPException(status_code=404, detail="Result not found")
    await session.delete(row)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/dashboard")
async def dashboard(session: AsyncSession = Depends(get_session)) -> Dict[str, Any]:
    rows = (await session.execute(select(ModelTestResult))).scalars().all()

    grouped: dict[str, dict[str, Any]] = {}
    for row in rows:
        drum_type = classify_drum_type(row.source_kind)
        if drum_type == "other":
            continue

        if drum_type not in grouped:
            grouped[drum_type] = {
                "drum_type": drum_type,
                "total_results": 0,
                "score_sum": 0,
                "score_distribution": {value: 0 for value in range(0, 101, 10)},
                "low_band_count": 0,
                "high_band_count": 0,
            }

        grouped[drum_type]["total_results"] += 1
        grouped[drum_type]["score_sum"] += row.score
        grouped[drum_type]["score_distribution"][row.score] += 1
        if row.score <= 50:
            grouped[drum_type]["low_band_count"] += 1
        else:
            grouped[drum_type]["high_band_count"] += 1

    items = []
    for key in ["bass_drum", "snare", "low_tom", "mid_tom", "high_tom"]:
        data = grouped.get(key)
        if not data:
            items.append(
                {
                    "drum_type": key,
                    "total_results": 0,
                    "average_score": 0,
                    "score_distribution": {value: 0 for value in range(0, 101, 10)},
                    "low_band_count": 0,
                    "high_band_count": 0,
                }
            )
            continue

        avg = data["score_sum"] / data["total_results"] if data["total_results"] else 0
        items.append(
            {
                "drum_type": key,
                "total_results": data["total_results"],
                "average_score": round(avg, 1),
                "score_distribution": data["score_distribution"],
                "low_band_count": data["low_band_count"],
                "high_band_count": data["high_band_count"],
            }
        )

    total_results = sum(item["total_results"] for item in items)
    weighted_sum = sum(item["average_score"] * item["total_results"] for item in items)
    overall_average = round(weighted_sum / total_results, 1) if total_results else 0

    return {
        "overall_average_score": overall_average,
        "total_results": total_results,
        "by_drum_type": items,
    }

