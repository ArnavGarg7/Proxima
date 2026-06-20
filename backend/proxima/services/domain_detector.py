"""
Domain Detection Engine.

Analyzes text to classify its domain relevance. Supported domains for this phase
are Legal, Medical, and Engineering/Code. Outputs a probability distribution.
"""

from typing import Dict
import re

class DomainDetectorService:
    def __init__(self):
        """
        Initialize the DomainDetectorService.
        """
        self.keywords = {
            "legal": [
                r"\b(contract|agreement|liability|jurisdiction|plaintiff|defendant|litigation|statute|clause|hereby|whereas|indemnify|tort|subpoena|testimony|arbitration)\b"
            ],
            "medical": [
                r"\b(patient|diagnosis|symptom|clinical|treatment|therapy|syndrome|pathology|oncology|cardiovascular|neurological|prognosis|dosage|prescription|anatomy)\b"
            ],
            "code": [
                r"\b(function|def |class |import |return |const |let |var |void |struct |public |private |protected |interface|implements|extends|async|await|console\.log)\b",
                r"(\{|\}|\[|\]|\(|\)|=>|==|!=|===|!==|\+\+|--)"
            ]
        }
        
        self.compiled_patterns = {
            domain: [re.compile(pattern, re.IGNORECASE) for pattern in patterns]
            for domain, patterns in self.keywords.items()
        }

    async def detect_domain(self, text: str) -> Dict[str, float]:
        """
        Analyzes the provided text and computes probability scores for each supported domain.
        
        Args:
            text (str): The raw document text or a representative sample.
            
        Returns:
            Dict[str, float]: A dictionary containing normalized scores. 
            Example: {"legal": 0.1, "medical": 0.8, "code": 0.1}
        """
        scores = {"legal": 0.0, "medical": 0.0, "code": 0.0}
        
        if not text:
            return scores

        total_matches = 0
        for domain, patterns in self.compiled_patterns.items():
            for pattern in patterns:
                matches = len(pattern.findall(text))
                scores[domain] += matches
                total_matches += matches

        # Normalize
        if total_matches > 0:
            for domain in scores:
                scores[domain] = round(scores[domain] / total_matches, 3)
        else:
            # Baseline uniform distribution if no strong signals
            scores = {"legal": 0.333, "medical": 0.333, "code": 0.334}

        return scores
