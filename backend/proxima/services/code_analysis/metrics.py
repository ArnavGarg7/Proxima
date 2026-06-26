import re

def compute_metrics(code: str) -> dict:
    """
    Deterministically computes code profile metrics without relying on AST or LLM.
    """
    lines = code.split('\n')
    total_lines = len(lines)
    blank_lines = len([l for l in lines if not l.strip()])
    
    # Heuristics for comments
    comment_lines = len([l for l in lines if l.strip().startswith('#') or l.strip().startswith('//') or l.strip().startswith('/*') or l.strip().startswith('*')])
    
    functions = len(re.findall(r'\b(def|function|func|fn|public\s+\w+\s+\w+\(|private\s+\w+\s+\w+\()\b', code))
    classes = len(re.findall(r'\b(class|interface|struct)\b', code))
    imports = len(re.findall(r'\b(import|from|require|include|using)\b', code))
    
    # Methods count (often same as functions in heuristic scan)
    methods = functions
    
    # Estimated cyclomatic complexity
    complexity_keywords = ['if', 'else', 'for', 'while', 'case', 'catch', '&&', r'\|\|', 'and', 'or', 'except', 'elif']
    complexity = 1
    for kw in complexity_keywords:
        if kw.isalpha():
            complexity += len(re.findall(rf'\b{kw}\b', code))
        else:
            complexity += len(re.findall(kw, code))
            
    # Function length estimation
    est_methods = max(1, functions)
    avg_func_length = max(1, (total_lines - blank_lines - comment_lines) // est_methods)
    
    # Find longest block between indents (heuristic for longest function)
    longest_function = avg_func_length * 2  # Rough heuristic estimate if we don't do full AST
    
    return {
        "lines": total_lines,
        "functions": functions,
        "classes": classes,
        "methods": methods,
        "imports": imports,
        "comment_ratio": int((comment_lines / total_lines) * 100) if total_lines > 0 else 0,
        "longest_function": longest_function,
        "average_function": avg_func_length,
        "estimated_cyclomatic_complexity": complexity
    }
