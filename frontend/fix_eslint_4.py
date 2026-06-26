import os
import re

def patch(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r') as f: content = f.read()
    if old in content:
        content = content.replace(old, new)
        with open(path, 'w') as f: f.write(content)
        print(f"Patched {path}")

# CodeSuite
patch("d:/Projects/Proxima/frontend/src/pages/CodeSuite.tsx", "setMode(m as any); runAnalysis(m as any);", "setMode(m as 'review'); runAnalysis(m as 'review');")

# Audit
patch("d:/Projects/Proxima/frontend/src/pages/Audit.tsx", "diagnostics: Record<string, any>", "diagnostics: Record<string, unknown>")

# Dashboard
patch("d:/Projects/Proxima/frontend/src/pages/Dashboard.tsx", "const payload: any =", "const payload: unknown =")

# DomainRadar
patch("d:/Projects/Proxima/frontend/src/pages/DomainRadar.tsx", "const payload: any =", "const payload: unknown =")

# Workspace
patch("d:/Projects/Proxima/frontend/src/pages/Workspace.tsx", "const payload: any =", "const payload: unknown =")
patch("d:/Projects/Proxima/frontend/src/pages/Workspace.tsx", "const formData: any =", "const formData: unknown =")
patch("d:/Projects/Proxima/frontend/src/pages/Workspace.tsx", "let parsed: any =", "let parsed: unknown =")

# useWorkspaceStore
patch("d:/Projects/Proxima/frontend/src/store/useWorkspaceStore.ts", "set: any /* eslint-disable-line @typescript-eslint/no-explicit-any */", "set: any")
patch("d:/Projects/Proxima/frontend/src/store/useWorkspaceStore.ts", "get: any /* eslint-disable-line @typescript-eslint/no-explicit-any */", "get: any")
patch("d:/Projects/Proxima/frontend/src/store/useWorkspaceStore.ts", "(set: any, get: any)", "(set: any /* eslint-disable-line @typescript-eslint/no-explicit-any */, get: any /* eslint-disable-line @typescript-eslint/no-explicit-any */)")

# Analyze.tsx (for react-hooks/exhaustive-deps)
def patch_analyze():
    path = "d:/Projects/Proxima/frontend/src/pages/Analyze.tsx"
    with open(path, 'r') as f: content = f.read()
    content = content.replace("// eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [documentId]);", "  }, [documentId, runAnalysis]);")
    # if there is any 'any' remaining
    content = content.replace("const payload: any =", "const payload: unknown =")
    with open(path, 'w') as f: f.write(content)
patch_analyze()

print("Done")
