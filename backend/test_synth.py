import asyncio
import sys
import json

sys.path.append("d:\\Projects\\Proxima\\backend")

from proxima.services.code_analysis.synthesizer import run_llm_synthesis

async def main():
    try:
        metrics = {"lines": 10}
        security = []
        maintainability = []
        res = await run_llm_synthesis("def a(): pass", "python", metrics, security, maintainability)
        print("RESULT:")
        print(json.dumps(res, indent=2))
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(main())
