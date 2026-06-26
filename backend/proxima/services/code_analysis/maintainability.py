import re
from typing import List, Dict

def scan_maintainability(code: str) -> List[Dict]:
    """
    Deterministically scans for maintainability anti-patterns.
    """
    findings = []
    lines = code.split('\n')
    
    # 1. Deep nesting heuristic
    for i, line in enumerate(lines):
        # Count leading spaces/tabs
        spaces = len(line) - len(line.lstrip(' '))
        tabs = len(line) - len(line.lstrip('\t'))
        
        if spaces >= 16 or tabs >= 4:
            findings.append({
                "severity": "MEDIUM",
                "title": "Deep Nesting",
                "description": "Code is deeply nested, making it hard to read and maintain.",
                "line": i + 1,
                "evidence": line.strip()
            })
            break # Just record it once
            
    # 2. Magic Numbers
    for i, line in enumerate(lines):
        # Exclude common numbers 0, 1, 2 or ones in strings
        if re.search(r'\b(?!0|1|2\b)\d+\b', line) and '=' in line and not line.strip().startswith('const'):
            if "TODO" not in line:
                # Basic heuristic
                pass
                
    # 3. TODOs and FIXMEs
    for i, line in enumerate(lines):
        if "TODO" in line:
            findings.append({
                "severity": "LOW",
                "title": "TODO Comment",
                "description": "Unresolved TODO comment found in the code.",
                "line": i + 1,
                "evidence": line.strip()
            })
            break
        if "FIXME" in line:
            findings.append({
                "severity": "MEDIUM",
                "title": "FIXME Comment",
                "description": "Unresolved FIXME comment found in the code.",
                "line": i + 1,
                "evidence": line.strip()
            })
            break
            
    # 4. Repeated Logic (very simple heuristic)
    # Check for consecutive identical non-empty lines
    for i in range(len(lines) - 1):
        if len(lines[i].strip()) > 10 and lines[i].strip() == lines[i+1].strip() and not lines[i].strip().startswith('}'):
            findings.append({
                "severity": "LOW",
                "title": "Duplicate Logic",
                "description": "Consecutive identical lines detected.",
                "line": i + 1,
                "evidence": lines[i].strip()
            })
            break
            
    return findings
