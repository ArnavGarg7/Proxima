from .detector import detect_language
from .metrics import compute_metrics
from .security import scan_security
from .maintainability import scan_maintainability
from .synthesizer import run_llm_synthesis

class CodeAnalyzer:
    @staticmethod
    async def analyze(code: str, language_hint: str = None, operation: str = "review") -> dict:
        """
        Orchestrates the Code Suite intelligence pipeline.
        Deterministic first, LLM synthesis second.
        """
        # Stage A: Language Detection
        language = detect_language(code, language_hint)
        
        # Stage B & C: Deterministic Metrics
        metrics = compute_metrics(code)
        
        # Stage D: Security Heuristics
        security = scan_security(code, language)
        
        # Stage E: Maintainability Heuristics
        maintainability = scan_maintainability(code)
        
        # Compile Deterministic Signals Used
        signals_used = [f"{language} detected"]
        for s in security:
            if s["title"] not in signals_used:
                signals_used.append(s["title"])
        for m in maintainability:
            if m["title"] not in signals_used:
                signals_used.append(m["title"])
                
        # Stage F: LLM Synthesis
        synthesis = await run_llm_synthesis(code, language, metrics, security, maintainability, operation)
        
        return {
            "language": language,
            "deterministic_signals": signals_used,
            "metrics": metrics,
            "executive_summary": synthesis.get("executive_summary", ""),
            "overall_score": synthesis.get("overall_score", 0),
            "radar_scores": {
                "security": synthesis.get("security_score", 0),
                "maintainability": synthesis.get("maintainability_score", 0),
                "documentation": synthesis.get("documentation_score", 0),
                "performance": synthesis.get("performance_score", 0),
            },
            "review_priorities": synthesis.get("review_priorities", []),
            "security_findings": synthesis.get("security_findings", []),
            "maintainability_findings": synthesis.get("maintainability_findings", []),
            "performance_findings": synthesis.get("performance_findings", []),
            "documentation_findings": synthesis.get("documentation_findings", [])
        }
