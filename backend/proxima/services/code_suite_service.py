import re
import json
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from proxima.services.model_registry import model_registry

class CodeSuiteService:
    """
    Code Analysis Workbench Service.
    Stage A: Deterministic snippet inspection.
    Stage B: AI synthesis for specific code operations.
    """

    @staticmethod
    def detect_language(snippet: str) -> str:
        snippet_lower = snippet.lower()
        
        # Simple heuristics
        if "select " in snippet_lower and "from " in snippet_lower:
            return "sql"
        if re.search(r'\b(def |import |class |elif )\b', snippet):
            return "python"
        if re.search(r'\b(const |let |var |=>|console\.log)\b', snippet) and not re.search(r'\b(interface |type |implements )\b', snippet):
            return "javascript"
        if re.search(r'\b(const |let |var |=>|console\.log)\b', snippet) and re.search(r'\b(interface |type |implements |: string|: number|: boolean)\b', snippet):
            return "typescript"
        if re.search(r'<(html|div|span|p|a)\b', snippet_lower):
            return "html"
        if re.search(r'([{][^}]*margin:|padding:|color:|background-color:)', snippet_lower):
            return "css"
        if re.match(r'^\s*({|\[)\s*["\']', snippet):
            return "json"
        if re.match(r'^[\w\s-]+:\s*\n?\s+(-\s+)?[\w\s]+', snippet) and not "{" in snippet:
            return "yaml"
        if re.search(r'\b(echo |#!/bin/bash|#!/bin/sh|grep |awk |sed )\b', snippet):
            return "bash"
        if re.search(r'\b(public class |public static void main|System\.out\.println)\b', snippet):
            return "java"
        if re.search(r'\b(#include <|std::|cout|cin)\b', snippet):
            return "cpp"
        if re.search(r'\b(using System|namespace |Console\.WriteLine)\b', snippet):
            return "csharp"
        if re.search(r'\b(func |package |import |go )\b', snippet):
            return "go"
        if re.search(r'\b(fn |let mut |match |println!)\b', snippet):
            return "rust"
        if "<?php" in snippet_lower or re.search(r'\b(\$[a-zA-Z_]\w*\s*=|echo |function )\b', snippet) and "$" in snippet:
            return "php"
        
        # Fallback based on typical code structure
        if "{" in snippet and "}" in snippet and ";" in snippet:
            return "clike" # Generic fallback
            
        return "unknown"

    @staticmethod
    def extract_code_features(snippet: str, language: str) -> dict:
        lines = snippet.split('\n')
        line_count = len(lines)
        
        function_count = len(re.findall(r'\b(def |function |func |fn |=>|class |public static )\b', snippet))
        class_count = len(re.findall(r'\b(class |struct |interface )\b', snippet))
        import_count = len(re.findall(r'\b(import |from |require\(|include |using |#include )\b', snippet))
        
        # Approximate comments
        comment_lines = sum(1 for line in lines if re.match(r'^\s*(#|//|/\*|\*|--)', line))
        
        sql_tables_detected = []
        if language == "sql":
            # Simple extraction after FROM or JOIN
            matches = re.findall(r'\b(?:FROM|JOIN)\s+([a-zA-Z0-9_]+)', snippet, re.IGNORECASE)
            sql_tables_detected = list(set(matches))
            
        is_weak_code = False
        # If it has almost no code-like structure (brackets, indents, semi-colons, keywords) and looks like plain text
        if function_count == 0 and import_count == 0 and not re.search(r'[{};=]', snippet):
            # Exempt markup/config languages from being immediately marked as weak
            if language not in ["json", "yaml", "html", "css", "bash", "sql"]:
                words = snippet.split()
                if len(words) > 10:
                    is_weak_code = True
                
        return {
            "line_count": line_count,
            "function_count": function_count,
            "class_count": class_count,
            "import_count": import_count,
            "comment_lines": comment_lines,
            "sql_tables_detected": sql_tables_detected,
            "is_weak_code": is_weak_code
        }

    @staticmethod
    def detect_review_signals(snippet: str, language: str) -> List[dict]:
        signals = []
        
        # Python
        if re.search(r'\beval\(', snippet):
            signals.append({"type": "risk", "detail": "Usage of eval() detected, potential RCE vulnerability."})
        if re.search(r'\bexec\(', snippet):
            signals.append({"type": "risk", "detail": "Usage of exec() detected."})
        if re.search(r'except\s*:', snippet) or re.search(r'except Exception:', snippet):
            signals.append({"type": "smell", "detail": "Broad exception handling detected."})
            
        # SQL
        if language == "sql":
            if re.search(r'\bSELECT\s+\*', snippet, re.IGNORECASE):
                signals.append({"type": "smell", "detail": "SELECT * used, which can impact performance and reliability."})
            if not re.search(r'\bWHERE\b', snippet, re.IGNORECASE) and re.search(r'\b(UPDATE|DELETE)\b', snippet, re.IGNORECASE):
                signals.append({"type": "risk", "detail": "UPDATE/DELETE statement without a WHERE clause."})
                
        # JS/TS
        if ".innerHTML" in snippet:
            signals.append({"type": "risk", "detail": "Usage of innerHTML detected, potential XSS vulnerability."})
            
        # Bash
        if language == "bash":
            if re.search(r'\brm\s+-rf\s+/', snippet):
                signals.append({"type": "risk", "detail": "Extremely dangerous file deletion command detected."})
            if not snippet.startswith("#!"):
                signals.append({"type": "smell", "detail": "Missing shebang in bash script."})

        # General
        lines = snippet.split('\n')
        if len(lines) > 200:
            signals.append({"type": "smell", "detail": "Snippet is very large, suggesting possible need for refactoring."})
            
        # Basic hardcoded secrets (very naive)
        if re.search(r'(api_key|password|secret|token)\s*=\s*["\'][a-zA-Z0-9-_]{10,}["\']', snippet, re.IGNORECASE):
            signals.append({"type": "risk", "detail": "Potential hardcoded secret or API key detected."})
            
        return signals

    @staticmethod
    async def analyze(db: AsyncSession, snippet: str, operation: str, language: str = None) -> dict:
        if not snippet or not snippet.strip():
            return CodeSuiteService._fallback_response("empty")
        
        # Alias normalization
        norm_lang_map = {
            "c++": "cpp",
            "c#": "csharp",
            "bash / shell": "bash",
            "js": "javascript",
            "ts": "typescript",
            "yml": "yaml",
            "html / css": "html",
            "javascript / typescript": "javascript"
        }
        normalized_override = norm_lang_map.get(language.lower(), language.lower()) if language else None
            
        detected_lang = normalized_override if normalized_override else CodeSuiteService.detect_language(snippet)
        features = CodeSuiteService.extract_code_features(snippet, detected_lang)
        
        if features.get("is_weak_code"):
            return CodeSuiteService._fallback_response("weak", detected_lang, features)
            
        signals = CodeSuiteService.detect_review_signals(snippet, detected_lang)
        
        # Stage B: AI Synthesis
        model = await model_registry.get_default_generation(db)
        
        schema = {
            "type": "OBJECT",
            "properties": {
                "operation": {"type": "STRING"},
                "language_detected": {"type": "STRING"},
                "summary": {"type": "STRING"},
                "result_markdown": {"type": "STRING"},
                "snippet_profile": {
                    "type": "OBJECT",
                    "properties": {
                        "line_count": {"type": "INTEGER"},
                        "function_count": {"type": "INTEGER"},
                        "class_count": {"type": "INTEGER"},
                        "import_count": {"type": "INTEGER"},
                        "comment_lines": {"type": "INTEGER"}
                    }
                },
                "review_actions": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "title": {"type": "STRING"},
                            "description": {"type": "STRING"},
                            "severity": {"type": "STRING", "enum": ["critical", "high", "medium", "low"]},
                            "category": {"type": "STRING", "enum": ["security", "performance", "maintainability", "reliability"]}
                        }
                    }
                },
                "diagnostics": {
                    "type": "OBJECT",
                    "properties": {
                        "review_signals_detected": {"type": "INTEGER"}
                    }
                }
            },
            "required": ["operation", "language_detected", "summary", "result_markdown", "snippet_profile", "review_actions", "diagnostics"]
        }

        # Setup language family specific prompt instructions
        family_instructions = ""
        if detected_lang in ["json", "yaml"]:
            if operation == "explain": family_instructions = "Focus on summarizing the configuration structure and major sections."
            elif operation == "review": family_instructions = "Focus on organization, clarity, duplication risk, and config readability. Ignore code execution risks."
            elif operation == "docs": family_instructions = "Generate a concise schema-style overview or config documentation summary."
        elif detected_lang in ["html", "css"]:
            if operation == "explain": family_instructions = "Describe layout structure, semantic roles, styling organization, and reusable patterns."
            elif operation == "review": family_instructions = "Focus on maintainability, structure, and obvious frontend issues (not backend code execution)."
            elif operation == "docs": family_instructions = "Produce component or stylesheet summaries."
        elif detected_lang == "sql":
            if operation == "explain": family_instructions = "Break down query structure, joins, filters, aggregations, and CTEs."
            elif operation == "review": family_instructions = "Flag obvious issues such as SELECT *, weak filtering, risky string-built queries, or maintainability."
            elif operation == "docs": family_instructions = "Summarize query purpose and query component roles."
        elif detected_lang == "bash":
            if operation == "explain": family_instructions = "Describe command flow and script purpose."
            elif operation == "review": family_instructions = "Surface dangerous destructive patterns, brittle piping, quoting issues, and maintainability concerns."
            elif operation == "docs": family_instructions = "Summarize script intent and major steps."
        else:
            # Traditional code languages
            if operation == "explain": family_instructions = "Describe control flow, structure, functions, classes, and logic."
            elif operation == "review": family_instructions = "Identify maintainability, reliability, performance, and obvious security risks."
            elif operation == "docs": family_instructions = "Generate snippet, module, class, or function documentation in a concise structured format."

        system_prompt = f"""
You are an expert Code Analysis engine. You are performing a single-file/single-snippet '{operation}' operation.
You must return the result matching the required JSON schema EXACTLY.

Constraints:
- You must generate ONLY valid JSON.
- For operation '{operation}' with language '{detected_lang}': {family_instructions}
- If operation is 'explain', focus `result_markdown` on explanation. `review_actions` should be empty.
- If operation is 'review', populate `review_actions` with findings. `result_markdown` can summarize the overall health.
- If operation is 'docs', generate robust markdown documentation in `result_markdown`. `review_actions` should be empty.
- Keep the tone professional, objective, and deterministic.

Stage A Inspection Context:
- Detected Language: {detected_lang}
- Code Features: {json.dumps(features)}
- Review Signals: {json.dumps(signals)}

Incorporate these signals into your analysis where relevant.
"""

        user_message = f"Snippet:\n```\n{snippet}\n```\n\nPerform the '{operation}' operation and return JSON."

        # Make the LLM call using the model registry's structured generation
        try:
            if model.provider == 'google' and "gemini" in model.model_id.lower():
                from google.generativeai import GenerativeModel
                import google.generativeai as genai
                
                gm = GenerativeModel(model.model_id, system_instruction=system_prompt)
                result = gm.generate_content(
                    user_message,
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                        response_schema=schema,
                        temperature=0.2
                    )
                )
                response_json = json.loads(result.text)
            else:
                import os
                from groq import AsyncGroq
                api_key = os.environ.get("GROQ_API_KEY")
                client = AsyncGroq(api_key=api_key)
                
                # Append schema to system prompt for Groq
                groq_system_prompt = system_prompt + f"\n\nYou MUST return a JSON object that strictly adheres to the following JSON schema:\n{json.dumps(schema, indent=2)}"
                
                response = await client.chat.completions.create(
                    model=model.model_id,
                    messages=[
                        {"role": "system", "content": groq_system_prompt},
                        {"role": "user", "content": user_message}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.2
                )
                response_json = json.loads(response.choices[0].message.content)
            
            if "diagnostics" not in response_json:
                response_json["diagnostics"] = {}
            response_json["diagnostics"]["review_signals_detected"] = len(signals)
            
            return response_json
            
        except Exception as e:
            return CodeSuiteService._fallback_response("error", detected_lang, features, str(e))

    @staticmethod
    def _fallback_response(reason: str, lang: str = "unknown", features: dict = None, error_msg: str = "") -> dict:
        features = features or {"line_count": 0, "function_count": 0, "class_count": 0, "import_count": 0, "comment_lines": 0}
        
        msg = "The snippet does not appear to contain executable code."
        if reason == "empty":
            msg = "No code provided."
        elif reason == "error":
            msg = f"Analysis failed: {error_msg}"
            
        return {
            "operation": "unknown",
            "language_detected": lang,
            "summary": "Analysis aborted or fallback triggered.",
            "result_markdown": f"**Analysis Unavailable**\n\n{msg}\n\nPlease provide a valid code snippet.",
            "snippet_profile": {
                "line_count": features.get("line_count", 0),
                "function_count": features.get("function_count", 0),
                "class_count": features.get("class_count", 0),
                "import_count": features.get("import_count", 0),
                "comment_lines": features.get("comment_lines", 0)
            },
            "review_actions": [],
            "diagnostics": {
                "fallback_reason": reason,
                "review_signals_detected": 0
            }
        }
