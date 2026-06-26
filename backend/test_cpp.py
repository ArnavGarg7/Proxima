import asyncio
import sys
import json

sys.path.append("d:\\Projects\\Proxima\\backend")

from proxima.services.code_analysis.analyzer import CodeAnalyzer

cpp_code = """#include <iostream>
#include <complex>

int main() {
    // Enable std::complex_literals to use the suffix "i" for imaginary numbers
    using namespace std::complex_literals;

    // Initialize complex numbers: (real + imaginary)
    std::complex<double> z1 = 3.0 + 4.0i;
    std::complex<double> z2 = 1.0 - 2.0i;

    // Standard arithmetic operations are built-in
    std::complex<double> sum = z1 + z2;
    std::complex<double> product = z1 * z2;
"""

async def main():
    try:
        res = await CodeAnalyzer.analyze(cpp_code, "cpp")
        print("SUCCESS")
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(main())
