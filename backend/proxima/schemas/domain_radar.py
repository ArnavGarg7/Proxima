"""
Domain Radar LLM-resolution schema (Stage 7F P0).

Mirrors the exact `resolution` object DomainRadar previously parsed from the raw
provider response, so routing the call through ProximaAIEngine does not change
the analyzer's public output shape.
"""
from typing import List

from pydantic import BaseModel


class PrimaryDomain(BaseModel):
    domain: str
    score: float
    confidence_label: str


class RecommendedSurface(BaseModel):
    surface: str
    reason: str


class DomainRadarResolution(BaseModel):
    primary_domain: PrimaryDomain
    summary: str
    recommended_surfaces: List[RecommendedSurface]
