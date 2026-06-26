import json
import re
import math
from langdetect import detect
from proxima.services.model_registry import ModelRegistry
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
        model = await ModelRegistry.get_default_generation(db)
        
        try:
            response_json = await model.generate_json(
                prompt=prompt,
                system_prompt=system_prompt,
                schema=GeneralAnalysisResult.model_json_schema()
            )
            
            result_dict = json.loads(response_json)
            result_dict["metadata"] = {
                "reading_time_minutes": reading_time,
                "word_count": word_count,
                "language": language
            }
            
            # Combine signals
            existing_signals = result_dict.get("signals", [])
            result_dict["signals"] = list(set(existing_signals + signals))
            
            return result_dict
            
        except Exception as e:
            # Deterministic fallback
            return {
                "executive_summary": "Failed to generate LLM summary. Showing deterministic fallback.",
                "takeaways": [],
                "topics": [],
                "entities": [],
                "dates": [],
                "numbers": [],
                "risks": [{"level": "High", "description": "LLM extraction failed", "evidence": []}],
                "actions": [],
                "metadata": {
                    "reading_time_minutes": reading_time,
                    "word_count": word_count,
                    "language": language
                },
                "confidence": 0,
                "signals": signals + ["Fallback Mode"]
            }
