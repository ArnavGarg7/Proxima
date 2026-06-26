import re

def detect_language(code: str, hint: str = None) -> str:
    """
    Deterministically detects the programming language using heuristic signatures
    if no explicit hint is provided.
    """
    if hint and hint.lower() not in ["auto", "unknown", ""]:
        return hint.title()
    
    code_lower = code.lower()
    
    if "def " in code and ("import " in code or "print(" in code): return "Python"
    if "function " in code and ("console.log" in code or "document." in code or "=>" in code or "const " in code): return "JavaScript"
    if "interface " in code and ("type " in code or "export " in code): return "TypeScript"
    if "public class " in code and "public static void main" in code: return "Java"
    if "#include" in code and "int main" in code: return "C++"
    if "using System;" in code and "namespace " in code: return "C#"
    if "<?php" in code: return "PHP"
    if "func " in code and "package " in code: return "Go"
    if "fn " in code and "let mut" in code: return "Rust"
    if "select " in code_lower and "from " in code_lower and ("where " in code_lower or "join " in code_lower): return "SQL"
    if code.startswith("#!") and "bin/bash" in code: return "Bash"
    
    return "Unknown"
