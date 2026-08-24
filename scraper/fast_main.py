from fastapi import FastAPI
from pydantic import BaseModel
from duckduckgo_search import DDGS
import trafilatura

app = FastAPI()

class SearchRequest(BaseModel):
    query: str
    max_results: int = 10
    region: str = "wt-wt"

@app.post("/search")
async def search_ddgs(req: SearchRequest):
    try:
        results = DDGS().text(req.query, region=req.region, max_results=req.max_results)
        return {"success": True, "results": [{"title": r["title"], "url": r["href"], "snippet": r["body"]} for r in results]}
    except Exception as e:
        return {"success": False, "error": str(e)}

class ExtractRequest(BaseModel):
    html: str
    url: str = None

@app.post("/extract_text")
async def extract_text(req: ExtractRequest):
    try:
        text = trafilatura.extract(req.html, include_links=True, url=req.url)
        return {"success": True, "text": text or "", "pdf_links": []}
    except Exception as e:
        return {"success": False, "error": str(e)}
