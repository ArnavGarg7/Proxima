import json
import re
import math
import time
from langdetect import detect
from proxima.services.model_registry import model_registry
from proxima.schemas.general_analysis import GeneralAnalysisResult

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
        
        model = await model_registry.get_default_generation(db)
        
        system_prompt_with_schema = system_prompt + f"\n\nJSON SCHEMA TO MATCH:\n{json.dumps(GeneralAnalysisResult.model_json_schema(), indent=2)}\n\nIMPORTANT: Return ONLY valid JSON, without any markdown formatting like ```json"
        
        import structlog
        logger = structlog.get_logger()
        
        start_time = time.time()
        response_json = ""
        parse_success = False
        
        try:
            response_json = await model_registry.complete(
                model=model,
                system_prompt=system_prompt_with_schema,
                user_message=prompt,
                temperature=0.1,
                max_tokens=8192,
                response_format="json"
            )
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            # Robust JSON cleanup
            cleaned_json = response_json.strip()
            if cleaned_json.startswith("```json"):
                cleaned_json = cleaned_json[7:]
            if cleaned_json.startswith("```"):
                cleaned_json = cleaned_json[3:]
            if cleaned_json.endswith("```"):
                cleaned_json = cleaned_json[:-3]
            cleaned_json = cleaned_json.strip()
            
            result_dict = json.loads(cleaned_json)
            parse_success = True
            
            # Strict Schema Validation - this will raise ValueError/ValidationError if missing required keys
            # By passing through Pydantic model, it strips unknown keys and ensures types.
            validated_model = GeneralAnalysisResult(**result_dict)
            result_dict = validated_model.model_dump()
            
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
                provider=model.provider,
                model=model.model_id,
                latency_ms=latency_ms,
                raw_response_length=len(response_json),
                parse_success=parse_success
            )
            
            return result_dict
            
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            
            # Identify specific exception details
            exception_type = type(e).__name__
            exception_message = str(e)
            
            http_status_code = getattr(e, "status_code", None)
            
            if not parse_success and response_json:
                fallback_reason = "JSON Parsing or Schema Validation Failed"
            elif not response_json:
                fallback_reason = "Provider/Network Error"
            else:
                fallback_reason = "Unknown Pipeline Error"
                
            logger.error(
                "GeneralDocumentAnalyzer LLM fallback triggered",
                provider=model.provider,
                model=model.model_id,
                latency_ms=latency_ms,
                http_status_code=http_status_code,
                raw_response_length=len(response_json),
                raw_response_preview=response_json[:500] if response_json else None,
                parse_success=parse_success,
                exception_type=exception_type,
                exception_message=exception_message,
                fallback_reason=fallback_reason
            )
            
            with open("/app/debug_exception.log", "w") as f:
                f.write(f"Exception: {exception_type}: {exception_message}\n")
                f.write(f"Fallback Reason: {fallback_reason}\n")
                f.write(f"Raw Response: {response_json}\n")
            
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
