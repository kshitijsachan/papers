"""Semantic Scholar API client for paper recommendations and metadata."""

import asyncio

import httpx

BASE_URL = "https://api.semanticscholar.org"
GRAPH_API = f"{BASE_URL}/graph/v1"
RECOMMENDATIONS_API = f"{BASE_URL}/recommendations/v1"

# Rate limiting: Semantic Scholar allows ~100 requests/5 min without API key
RATE_LIMIT_DELAY = 0.5


async def get_paper(paper_id: str, client: httpx.AsyncClient | None = None) -> dict | None:
    """Get paper details by Semantic Scholar ID or arXiv ID.

    Parameters
    ----------
    paper_id : str
        Semantic Scholar paper ID or arXiv ID (prefix with 'arXiv:' for arXiv IDs).
    client : httpx.AsyncClient | None
        Optional HTTP client to reuse. If None, creates a new client.

    Returns
    -------
    dict | None
        Paper details including title, authors, abstract, etc., or None if not found.
    """
    url = f"{GRAPH_API}/paper/{paper_id}"
    params = {
        "fields": "title,authors,abstract,year,citationCount,url,externalIds",
    }

    async def _fetch(c: httpx.AsyncClient) -> dict | None:
        try:
            response = await c.get(url, params=params, timeout=30.0)
            if response.status_code == 429:
                await asyncio.sleep(RATE_LIMIT_DELAY * 2)
                response = await c.get(url, params=params, timeout=30.0)
            if response.status_code == 200:
                return response.json()
            return None
        except httpx.RequestError:
            return None

    if client:
        return await _fetch(client)

    async with httpx.AsyncClient() as c:
        return await _fetch(c)


async def search_paper(arxiv_id: str, client: httpx.AsyncClient | None = None) -> str | None:
    """Find Semantic Scholar paper ID from arXiv ID.

    Parameters
    ----------
    arxiv_id : str
        The arXiv ID (e.g., '2301.12345').
    client : httpx.AsyncClient | None
        Optional HTTP client to reuse.

    Returns
    -------
    str | None
        Semantic Scholar paper ID, or None if not found.
    """
    paper = await get_paper(f"arXiv:{arxiv_id}", client=client)
    if paper:
        return paper.get("paperId")
    return None


async def get_recommendations(
    paper_ids: list[str],
    limit: int = 20,
    client: httpx.AsyncClient | None = None,
) -> list[dict]:
    """Get paper recommendations based on positive paper IDs.

    Parameters
    ----------
    paper_ids : list[str]
        List of Semantic Scholar paper IDs to use as positive examples.
    limit : int
        Maximum number of recommendations to return. Default is 20.
    client : httpx.AsyncClient | None
        Optional HTTP client to reuse.

    Returns
    -------
    list[dict]
        List of recommended papers with title, authors, abstract, etc.
    """
    url = f"{RECOMMENDATIONS_API}/papers/"
    params = {"limit": limit, "fields": "title,authors,abstract,year,publicationDate,citationCount,url,externalIds"}
    payload = {"positivePaperIds": paper_ids}

    async def _fetch(c: httpx.AsyncClient) -> list[dict]:
        try:
            response = await c.post(url, json=payload, params=params, timeout=30.0)
            if response.status_code == 429:
                await asyncio.sleep(RATE_LIMIT_DELAY * 2)
                response = await c.post(url, json=payload, params=params, timeout=30.0)
            if response.status_code == 200:
                data = response.json()
                return data.get("recommendedPapers", [])
            return []
        except httpx.RequestError:
            return []

    if client:
        return await _fetch(client)

    async with httpx.AsyncClient() as c:
        return await _fetch(c)
