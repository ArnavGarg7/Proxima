import re
from typing import List, Dict

SECURITY_RULES = [
    {"pattern": r"\beval\(", "severity": "HIGH", "title": "eval() used", "desc": "Arbitrary code execution risk. Use safer alternatives like ast.literal_eval.", "lang": ["Python", "JavaScript"]},
    {"pattern": r"\bexec\(", "severity": "HIGH", "title": "exec() used", "desc": "Arbitrary code execution risk.", "lang": ["Python"]},
    {"pattern": r"pickle\.loads\(", "severity": "HIGH", "title": "pickle.loads() used", "desc": "Insecure deserialization risk. Attackers can execute arbitrary code.", "lang": ["Python"]},
    {"pattern": r"subprocess\.Popen\(.*?shell=True\)", "severity": "HIGH", "title": "shell=True", "desc": "Command injection risk. Avoid passing untrusted inputs to the shell.", "lang": ["Python"]},
    {"pattern": r"\.innerHTML\s*=", "severity": "HIGH", "title": "innerHTML assignment", "desc": "XSS vulnerability. Use textContent or DOM manipulation instead.", "lang": ["JavaScript", "TypeScript"]},
    {"pattern": r"document\.write\(", "severity": "MEDIUM", "title": "document.write()", "desc": "XSS risk and performance issues. Use DOM manipulation.", "lang": ["JavaScript", "TypeScript"]},
    {"pattern": r"SELECT\s+\*\s+FROM", "severity": "MEDIUM", "title": "SELECT *", "desc": "Fetches unnecessary columns. Specify explicitly which columns are needed.", "lang": ["SQL", "Python", "Java", "PHP"]},
    {"pattern": r"password\s*=\s*['\"][^'\"]+['\"]", "severity": "HIGH", "title": "Hardcoded Password", "desc": "Credentials should not be hardcoded in source files. Use environment variables.", "lang": ["All"]},
    {"pattern": r"api_key\s*=\s*['\"][^'\"]+['\"]", "severity": "HIGH", "title": "Hardcoded API Key", "desc": "Secrets should not be hardcoded. Use environment variables or a secrets manager.", "lang": ["All"]}
]

def scan_security(code: str, language: str) -> List[Dict]:
    """
    Deterministically scans for known security anti-patterns.
    """
    findings = []
    lines = code.split('\n')
    
    for rule in SECURITY_RULES:
        if "All" not in rule["lang"] and language not in rule["lang"]:
            continue
            
        for i, line in enumerate(lines):
            if re.search(rule["pattern"], line, re.IGNORECASE):
                findings.append({
                    "severity": rule["severity"],
                    "title": rule["title"],
                    "description": rule["desc"],
                    "line": i + 1,
                    "evidence": line.strip()
                })
                # Prevent spamming the same rule on every line
                if len([f for f in findings if f["title"] == rule["title"]]) >= 3:
                    break
                    
    return findings
