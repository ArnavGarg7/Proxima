import re
import math
from langdetect import detect
import structlog
from proxima.schemas.general_analysis import GeneralAnalysisResult
from proxima.services.execution.engine import ProximaAIEngine, AIExecutionRequest
from proxima.services.execution.errors import SchemaValidationError

logger = structlog.get_logger()

class GeneralDocumentAnalyzer:
    @staticmethod
    async def analyze(db, full_text: str, metadata: dict) -> dict:
        word_count = len(full_text.split())
        reading_time = max(1, math.ceil(word_count / 250))
        
        try:
            language = detect(full_text[:1000])
        except:
            language = "en"

        signals = []
        if word_count > 10000:
            signals.append("Lengthy Document")
        if re.search(r'\b(confidential|proprietary|secret)\b', full_text, re.IGNORECASE):
            signals.append("Contains Confidentiality Markers")
        if re.search(r'\b(action item|next step|todo|to-do)\b', full_text, re.IGNORECASE):
            signals.append("Contains Action Items")
            
        system_prompt = """You are Proxima's General Intelligence Engine.
You must analyze the provided document text and extract structured insights.
Output strictly in JSON matching the GeneralAnalysisResult schema.

Requirements:
- executive_summary: A high-level 2-3 paragraph summary.
- takeaways: Up to 5 key points.
- topics: Main themes discussed.
- entities: Important people, orgs, locations.
- dates: Any significant dates.
- numbers: Any key financial or quantitative metrics.
- risks: Any uncertainties, issues, or risks.
- actions: Any requested next steps or action items.
- confidence: Give a score 0-100 on how confident you are in this extraction.

Every extracted takeaway, topic, date, number, risk, and action MUST include an `evidence` array with exact quotes.

Do NOT hallucinate. If a section (like dates or numbers) has no matches, return an empty array.
"""
        
        prompt = f"""DOCUMENT METADATA:
Title: {metadata.get('title', 'Unknown')}
Word Count: {word_count}

DOCUMENT TEXT:
{full_text}
"""
        
        request = AIExecutionRequest(
            task_class="general_analysis",
            domain=None,
            system_prompt=system_prompt,
            user_message=prompt,
            structured_output_schema=GeneralAnalysisResult,
            user_id=metadata.get("user_id"),
            document_id=metadata.get("document_id")
        )
        
        result = await ProximaAIEngine.execute(db, request, stream=False)
        
        if result.error:
            fallback_reason = "Unknown Pipeline Error"
            if isinstance(result.error, SchemaValidationError):
                fallback_reason = "JSON Parsing or Schema Validation Failed"
            elif type(result.error).__name__.startswith("Provider"):
                fallback_reason = "Provider/Network Error"
                
            logger.error(
                "GeneralDocumentAnalyzer LLM fallback triggered",
                provider=result.provider,
                model=result.model_id,
                latency_ms=result.latency_ms,
                exception_type=type(result.error).__name__,
                exception_message=str(result.error),
                fallback_reason=fallback_reason
            )
            
            with open("/app/debug_exception.log", "w") as f:
                f.write(f"Exception: {type(result.error).__name__}: {str(result.error)}\n")
                f.write(f"Fallback Reason: {fallback_reason}\n")
            
            # Deterministic, production-grade fallback (does not leak python errors)
            return {
                "executive_summary": "AI analysis could not be completed. Please try again later or check system status.",
                "takeaways": [],
                "topics": [],
                "entities": [],
                "dates": [],
                "numbers": [],
                "risks": [{"level": "High", "description": "AI Pipeline Unavailable", "evidence": []}],
                "actions": [],
                "metadata": {
                    "reading_time_minutes": reading_time,
                    "word_count": word_count,
                    "language": language
                },
                "confidence": 0,
                "signals": signals + ["Fallback Mode"]
            }
            
        result_dict = result.validated_data.model_dump()
        
        result_dict["metadata"] = {
            "reading_time_minutes": reading_time,
            "word_count": word_count,
            "language": language
        }
        
        # Combine signals
        existing_signals = result_dict.get("signals", [])
        result_dict["signals"] = list(set(existing_signals + signals))
        
        logger.info(
            "GeneralDocumentAnalyzer LLM success",
            provider=result.provider,
            model=result.model_id,
            latency_ms=result.latency_ms
        )
        
        return result_dict
