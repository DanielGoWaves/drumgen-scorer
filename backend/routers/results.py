from __future__ import annotations

from __future__ import annotations

from typing import Any, Dict, List, Optional
import math

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models import (
    Prompt,
    PromptRead,
    TestResult,
    TestResultCreate,
    TestResultRead,
    TestResultUpdate,
)
from ..services.analytics import calculate_generation_score

router = APIRouter()


@router.post("/score", response_model=TestResultRead, status_code=status.HTTP_201_CREATED, summary="Submit a score")
async def submit_score(
    payload: TestResultCreate, session: AsyncSession = Depends(get_session)
) -> TestResultRead:
    # If free text mode, create the prompt first with user-provided tags
    if payload.free_text_prompt and not payload.prompt_id:
        new_prompt = Prompt(
            text=payload.free_text_prompt,
            difficulty=payload.free_text_difficulty or 5,
            category=payload.free_text_category or "user-generated",
            drum_type=payload.free_text_drum_type,
            is_user_generated=True,
            used_count=1,
            expected_parameters=payload.generated_json
        )
        session.add(new_prompt)
        await session.commit()
        await session.refresh(new_prompt)
        prompt_id = new_prompt.id
    else:
        prompt_id = payload.prompt_id
        prompt = await session.get(Prompt, prompt_id)
        if not prompt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt not found")

    result = TestResult(
        prompt_id=prompt_id,
        audio_quality_score=payload.audio_quality_score,
        llm_accuracy_score=payload.llm_accuracy_score,
        generated_json=payload.generated_json,
        llm_response=payload.llm_response,
        audio_id=payload.audio_id,
        audio_file_path=payload.audio_file_path,
        model_version=payload.model_version,
        notes=payload.notes,
    )
    session.add(result)
    await session.commit()
    await session.refresh(result)
    return TestResultRead.model_validate(result)


@router.get("/dashboard", summary="Dashboard analytics")
async def dashboard(
    drum_type: Optional[str] = None,
    model_version: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
) -> Dict[str, Any]:
    """
    Dashboard analytics with optional drum type filtering.
    
    Returns:
    - overall_score: Weighted score (0-100) based on difficulty and accuracy
    - avg_audio_quality: Simple average of audio quality scores
    - avg_llm_accuracy: Simple average of LLM accuracy scores
    - total_tests: Total number of tests
    - by_version: Scores grouped by model version
    - difficulty_distribution: Tests by difficulty with score heat map
    """
    
    # Build base query with optional drum type and version filters
    base_query = select(TestResult, Prompt).join(Prompt, TestResult.prompt_id == Prompt.id)
    if drum_type:
        base_query = base_query.where(Prompt.drum_type == drum_type)
    if model_version:
        base_query = base_query.where(TestResult.model_version == model_version)
    
    # Get all test results with prompt info
    result = await session.execute(base_query)
    tests = [(test, prompt) for test, prompt in result.all()]
    
    if not tests:
        return {
            "overall_score": 0,
            "avg_audio_quality": 0,
            "avg_llm_accuracy": 0,
            "total_tests": 0,
            "by_version": [],
            "difficulty_distribution": []
        }
    
    # Calculate overall generation score (audio only, weighted by difficulty)
    generation_scores = []
    audio_scores = []
    llm_scores = []
    
    for test, prompt in tests:
        gen_score = calculate_generation_score(
            prompt.difficulty,
            test.audio_quality_score
        )
        generation_scores.append(gen_score)
        audio_scores.append(test.audio_quality_score)
        llm_scores.append(test.llm_accuracy_score)
    
    overall_generation_score = sum(generation_scores) / len(generation_scores) if generation_scores else 0
    
    # Group by version for progress tracking (generation score only)
    by_version = {}
    for test, prompt in tests:
        version = test.model_version or "unknown"
        if version not in by_version:
            by_version[version] = {
                "version": version,
                "count": 0,
                "generation_scores": [],
                "audio_scores": [],
                "llm_scores": []
            }
        by_version[version]["count"] += 1
        gen_score = calculate_generation_score(
            prompt.difficulty,
            test.audio_quality_score
        )
        by_version[version]["generation_scores"].append(gen_score)
        by_version[version]["audio_scores"].append(test.audio_quality_score)
        by_version[version]["llm_scores"].append(test.llm_accuracy_score)
    
    # Calculate averages per version
    version_data = []
    for version, data in by_version.items():
        avg_gen = sum(data["generation_scores"]) / len(data["generation_scores"]) if data["generation_scores"] else 0
        avg_audio = sum(data["audio_scores"]) / len(data["audio_scores"]) if data["audio_scores"] else 0
        avg_llm = sum(data["llm_scores"]) / len(data["llm_scores"]) if data["llm_scores"] else 0
        
        version_data.append({
            "version": version,
            "count": data["count"],
            "generation_score": math.ceil(avg_gen),
            "avg_audio": math.ceil(avg_audio * 10) / 10,
            "avg_llm": math.ceil(avg_llm * 10) / 10
        })
    
    # Difficulty distribution with score heat map
    difficulty_dist = {}
    for difficulty in range(1, 11):
        difficulty_dist[difficulty] = {
            "difficulty": difficulty,
            "total_tests": 0,
            "score_distribution": {i: 0 for i in range(1, 11)}  # count by score
        }
    
    for test, prompt in tests:
        diff = prompt.difficulty
        # Use audio (generation) score only for the heat map so reds/greens reflect audio quality
        audio_score = max(1, min(10, int(round(test.audio_quality_score))))
        difficulty_dist[diff]["total_tests"] += 1
        difficulty_dist[diff]["score_distribution"][audio_score] += 1
    
    return {
        "overall_generation_score": math.ceil(overall_generation_score),
        "avg_audio_quality": math.ceil((sum(audio_scores) / len(audio_scores)) * 10) / 10 if audio_scores else 0,
        "avg_llm_accuracy": math.ceil((sum(llm_scores) / len(llm_scores)) * 10) / 10 if llm_scores else 0,
        "total_tests": len(tests),
        "by_version": sorted(version_data, key=lambda x: x["version"]),
        "difficulty_distribution": list(difficulty_dist.values())
    }


# Results CRUD endpoints for Results page
@router.get("/", response_model=List[TestResultRead], summary="List all test results")
async def list_results(
    drum_type: Optional[str] = None,
    difficulty: Optional[int] = None,
    model_version: Optional[str] = None,
    audio_quality_score: Optional[int] = None,
    limit: int = 1000,
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
) -> List[TestResultRead]:
    """Get paginated list of test results with optional filtering."""
    # Use left join to ensure all results are returned even if prompt is missing
    # But since we always create prompts (even for free text), inner join should work
    query = select(TestResult).join(Prompt, TestResult.prompt_id == Prompt.id)
    
    # Apply filters - only add where clause if value is provided and not empty
    if drum_type and drum_type.strip():
        query = query.where(Prompt.drum_type == drum_type)
    if difficulty is not None:
        query = query.where(Prompt.difficulty == difficulty)
    if model_version and model_version.strip():
        query = query.where(TestResult.model_version == model_version)
    if audio_quality_score is not None:
        query = query.where(TestResult.audio_quality_score == audio_quality_score)
    
    query = query.order_by(TestResult.tested_at.desc()).offset(offset).limit(limit)
    
    result = await session.execute(query)
    results = result.scalars().all()
    
    return [TestResultRead.model_validate(r) for r in results]


@router.get("/{result_id}", response_model=TestResultRead, summary="Get single test result")
async def get_result(
    result_id: int,
    session: AsyncSession = Depends(get_session),
) -> TestResultRead:
    """Get detailed info for a specific test result."""
    result = await session.get(TestResult, result_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not found")
    return TestResultRead.model_validate(result)


@router.put("/{result_id}", response_model=TestResultRead, summary="Update test result")
async def update_result(
    result_id: int,
    payload: TestResultUpdate,
    session: AsyncSession = Depends(get_session),
) -> TestResultRead:
    """Update scores or notes for a test result."""
    result = await session.get(TestResult, result_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not found")
    
    if payload.audio_quality_score is not None:
        result.audio_quality_score = payload.audio_quality_score
    if payload.llm_accuracy_score is not None:
        result.llm_accuracy_score = payload.llm_accuracy_score
    if payload.notes is not None:
        result.notes = payload.notes
    
    await session.commit()
    await session.refresh(result)
    return TestResultRead.model_validate(result)


@router.delete("/{result_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete test result")
async def delete_result(
    result_id: int,
    session: AsyncSession = Depends(get_session),
):
    """Delete a test result."""
    result = await session.get(TestResult, result_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not found")
    
    await session.delete(result)
    await session.commit()

