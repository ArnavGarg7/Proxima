import pytest
from proxima.services.domain_detector import DomainDetectorService

@pytest.fixture
def detector():
    return DomainDetectorService()

@pytest.mark.asyncio
async def test_domain_detection_legal(detector):
    text = "The plaintiff hereby signs this contract and accepts liability in this jurisdiction."
    scores = await detector.detect_domain(text)
    
    assert scores["legal"] > scores["medical"]
    assert scores["legal"] > scores["code"]

@pytest.mark.asyncio
async def test_domain_detection_medical(detector):
    text = "The patient shows symptoms of a cardiovascular syndrome. Start clinical therapy."
    scores = await detector.detect_domain(text)
    
    assert scores["medical"] > scores["legal"]
    assert scores["medical"] > scores["code"]

@pytest.mark.asyncio
async def test_domain_detection_code(detector):
    text = "async def main():\n    console.log('test');\n    return False;"
    scores = await detector.detect_domain(text)
    
    assert scores["code"] > scores["legal"]
    assert scores["code"] > scores["medical"]

@pytest.mark.asyncio
async def test_domain_detection_empty(detector):
    scores = await detector.detect_domain("")
    assert scores["legal"] == 0.0
    assert scores["medical"] == 0.0
    assert scores["code"] == 0.0

@pytest.mark.asyncio
async def test_domain_detection_uniform(detector):
    text = "Just a generic sentence about the weather."
    scores = await detector.detect_domain(text)
    # Uniform baseline when no strong signals
    assert scores["legal"] == 0.333
    assert scores["medical"] == 0.333
    assert scores["code"] == 0.334
