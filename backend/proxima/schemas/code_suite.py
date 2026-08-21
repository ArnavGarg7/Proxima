"""
Code Suite structured-output schema (Stage 7E).

LegacyCodeResult mirrors the EXACT existing public shape returned by
CodeSuiteService (/code/explain, /code/docs) so migrating the LLM call onto
ProximaAIEngine does not change the API contract. `diagnostics` stays a free-form
object because the service injects `review_signals_detected` (and, in fallback,
`fallback_reason`) post-hoc.
"""
from typing import Any, Dict, List

from pydantic import BaseModel, Field


class SnippetProfile(BaseModel):
    line_count: int = 0
    function_count: int = 0
    class_count: int = 0
    import_count: int = 0
    comment_lines: int = 0


class ReviewAction(BaseModel):
    title: str
    description: str
    severity: str
    category: str


class LegacyCodeResult(BaseModel):
    operation: str
    language_detected: str
    summary: str
    result_markdown: str
    snippet_profile: SnippetProfile
    review_actions: List[ReviewAction] = Field(default_factory=list)
    diagnostics: Dict[str, Any] = Field(default_factory=dict)
