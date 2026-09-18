"""
test_dom_agent.py — Unit test for DOM agent element indexing and action dispatch.
"""

import asyncio
import logging
from fetchers.dom_agent import _DOM_INDEXER_JS, is_aggregator_domain, _call_llm_decision

logging.basicConfig(level=logging.INFO)

def test_aggregator_detection():
    assert is_aggregator_domain("https://www.brightermonday.co.ke/jobs/123") is True
    assert is_aggregator_domain("https://reliefweb.int/job/456") is True
    assert is_aggregator_domain("https://myworkdayjobs.com/company/apply") is False
    assert is_aggregator_domain("https://greenhouse.io/acme/jobs/1") is False
    print("test_aggregator_detection: PASS")


async def test_decision_structure():
    # Mock elements table
    sample_elements = [
        {"id": 0, "tag": "input", "type": "text", "label": "Search tenders", "href": "", "summary": '[0] <input type="text"> "Search tenders"'},
        {"id": 1, "tag": "button", "type": "submit", "label": "Search", "href": "", "summary": '[1] <button type="submit"> "Search"'},
    ]
    goal = "Search for 'Medical equipment' tenders"
    decision = await _call_llm_decision(goal, sample_elements, "https://tenders.go.ke", [])
    print("Decision returned:", decision)
    assert "action" in decision
    print("test_decision_structure: PASS")


if __name__ == "__main__":
    test_aggregator_detection()
    print("All static tests passed!")
