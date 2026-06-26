from pydantic import BaseModel, Field
from typing import List, Optional

class Evidence(BaseModel):
    quote: str = Field(description="Exact quote from the document text")
    context: Optional[str] = Field(None, description="Context explaining why this quote is relevant")

class Takeaway(BaseModel):
    point: str = Field(description="A key takeaway from the document")
    evidence: List[Evidence] = Field(default_factory=list)

class Topic(BaseModel):
    name: str = Field(description="Topic or theme identified in the document")
    description: str = Field(description="Brief explanation of how this topic is discussed")
    evidence: List[Evidence] = Field(default_factory=list)

class NamedEntity(BaseModel):
    name: str = Field(description="Name of the entity (Person, Organization, Location, etc.)")
    entity_type: str = Field(description="Type of the entity (e.g., 'Person', 'Organization', 'Location')")
    context: str = Field(description="Context in which the entity appears")

class ImportantDate(BaseModel):
    date: str = Field(description="The date or time period mentioned")
    significance: str = Field(description="Why this date is important")
    evidence: List[Evidence] = Field(default_factory=list)

class NumericalInsight(BaseModel):
    value: str = Field(description="The number, percentage, or currency value")
    metric: str = Field(description="What the number represents (e.g., 'Revenue', 'Growth')")
    context: str = Field(description="Context of the number")
    evidence: List[Evidence] = Field(default_factory=list)

class Risk(BaseModel):
    level: str = Field(description="Risk level: 'High', 'Medium', or 'Low'")
    description: str = Field(description="Description of the risk")
    evidence: List[Evidence] = Field(default_factory=list)

class ActionItem(BaseModel):
    action: str = Field(description="Action required or recommended")
    assignee: Optional[str] = Field(None, description="Who is responsible, if mentioned")
    evidence: List[Evidence] = Field(default_factory=list)

class AnalysisMetadata(BaseModel):
    reading_time_minutes: int
    word_count: int
    language: str

class GeneralAnalysisResult(BaseModel):
    executive_summary: str = Field(description="High-level summary of the entire document")
    takeaways: List[Takeaway] = Field(default_factory=list, description="Key points to remember")
    topics: List[Topic] = Field(default_factory=list, description="Main topics covered")
    entities: List[NamedEntity] = Field(default_factory=list, description="Important named entities")
    dates: List[ImportantDate] = Field(default_factory=list, description="Key dates and milestones")
    numbers: List[NumericalInsight] = Field(default_factory=list, description="Important metrics or values")
    risks: List[Risk] = Field(default_factory=list, description="Potential issues, risks, or uncertainties")
    actions: List[ActionItem] = Field(default_factory=list, description="Next steps or required actions")
    metadata: AnalysisMetadata
    confidence: int = Field(description="0-100 score of how confident the extraction is")
    signals: List[str] = Field(default_factory=list, description="Deterministic signals used to aid analysis")
