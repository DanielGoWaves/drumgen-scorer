from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, conint
from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Prompt(Base):
    __tablename__ = "prompts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    text: Mapped[str] = mapped_column(String, nullable=False)
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    drum_type: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    is_user_generated: Mapped[bool] = mapped_column(Integer, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    used_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    expected_parameters: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)

    results: Mapped[list["TestResult"]] = relationship(
        "TestResult", back_populates="prompt", cascade="all, delete-orphan"
    )


class TestResult(Base):
    __tablename__ = "test_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    prompt_id: Mapped[int] = mapped_column(ForeignKey("prompts.id", ondelete="CASCADE"), nullable=False)
    audio_quality_score: Mapped[int] = mapped_column(Integer, nullable=False)
    llm_accuracy_score: Mapped[int] = mapped_column(Integer, nullable=False)
    generated_json: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    audio_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    audio_file_path: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    model_version: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    tested_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    prompt: Mapped["Prompt"] = relationship("Prompt", back_populates="results")


# Pydantic schemas
class PromptCreate(BaseModel):
    text: str
    difficulty: conint(ge=1, le=10)
    category: Optional[str] = None
    drum_type: Optional[str] = None
    is_user_generated: bool = False
    expected_parameters: Optional[dict[str, Any]] = None


class PromptRead(BaseModel):
    id: int
    text: str
    difficulty: int
    category: Optional[str]
    drum_type: Optional[str]
    is_user_generated: bool
    created_at: datetime
    used_count: int
    expected_parameters: Optional[dict[str, Any]]

    class Config:
        from_attributes = True


class TestResultCreate(BaseModel):
    prompt_id: Optional[int] = None
    audio_quality_score: conint(ge=1, le=10)
    llm_accuracy_score: conint(ge=1, le=10)
    generated_json: Optional[dict[str, Any]] = None
    audio_id: Optional[str] = None
    audio_file_path: Optional[str] = None
    model_version: Optional[str] = None
    notes: Optional[str] = None
    
    # For free text prompts - user provides these
    free_text_prompt: Optional[str] = None
    free_text_drum_type: Optional[str] = None
    free_text_difficulty: Optional[conint(ge=1, le=10)] = None
    free_text_category: Optional[str] = None


class TestResultRead(BaseModel):
    id: int
    prompt_id: int
    audio_quality_score: int
    llm_accuracy_score: int
    generated_json: Optional[dict[str, Any]]
    audio_id: Optional[str]
    audio_file_path: Optional[str]
    model_version: Optional[str]
    tested_at: datetime
    notes: Optional[str]

    class Config:
        from_attributes = True


class TestResultUpdate(BaseModel):
    audio_quality_score: Optional[conint(ge=1, le=10)] = None
    llm_accuracy_score: Optional[conint(ge=1, le=10)] = None
    notes: Optional[str] = None

