import asyncio
import sys

sys.path.append("d:\\Projects\\Proxima\\backend")

from proxima.services.code_analysis.analyzer import CodeAnalyzer

async def main():
    try:
        res = await CodeAnalyzer.analyze("def a(): pass", "python")
        print(res)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(main())
