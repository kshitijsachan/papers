"""arXiv API client for fetching recent papers."""

import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

import httpx

ARXIV_API = "https://export.arxiv.org/api/query"

# Supported ML/AI categories
SUPPORTED_CATEGORIES = ["cs.LG", "cs.CL", "cs.AI", "stat.ML"]


def _parse_arxiv_response(xml_text: str) -> list[dict]:
    """Parse arXiv API XML response into paper dicts.

    Parameters
    ----------
    xml_text : str
        Raw XML response from arXiv API.

    Returns
    -------
    list[dict]
        List of paper dicts with title, authors, abstract, arxiv_id,
        published_date, and url.
    """
    ns = {
        "atom": "http://www.w3.org/2005/Atom",
        "arxiv": "http://arxiv.org/schemas/atom",
    }

    root = ET.fromstring(xml_text)
    papers = []

    for entry in root.findall("atom:entry", ns):
        title_el = entry.find("atom:title", ns)
        title = ""
        if title_el is not None and title_el.text:
            title = title_el.text.strip().replace("\n", " ")

        summary_el = entry.find("atom:summary", ns)
        abstract = None
        if summary_el is not None and summary_el.text:
            abstract = summary_el.text.strip()

        authors = []
        for author in entry.findall("atom:author", ns):
            name_el = author.find("atom:name", ns)
            if name_el is not None:
                authors.append(name_el.text)

        id_el = entry.find("atom:id", ns)
        arxiv_url = id_el.text if id_el is not None else None
        arxiv_id = arxiv_url.split("/abs/")[-1] if arxiv_url else None

        published_el = entry.find("atom:published", ns)
        published_date = published_el.text if published_el is not None else None

        papers.append({
            "title": title,
            "authors": ", ".join(authors),
            "abstract": abstract,
            "arxiv_id": arxiv_id,
            "published_date": published_date,
            "url": arxiv_url,
        })

    return papers


async def get_recent_papers(
    categories: list[str],
    days: int = 3,
    max_results: int = 100,
    client: httpx.AsyncClient | None = None,
) -> list[dict]:
    """Fetch recent papers from given arXiv categories.

    Parameters
    ----------
    categories : list[str]
        List of arXiv categories (e.g., ['cs.LG', 'cs.CL']).
        Supported: cs.LG, cs.CL, cs.AI, stat.ML.
    days : int
        Number of days to look back. Default is 3.
    max_results : int
        Maximum number of results to return. Default is 100.
    client : httpx.AsyncClient | None
        Optional HTTP client to reuse.

    Returns
    -------
    list[dict]
        List of papers with title, authors, abstract, arxiv_id,
        published_date, and url.
    """
    # Build category query (OR of all categories)
    valid_cats = [c for c in categories if c in SUPPORTED_CATEGORIES]
    if not valid_cats:
        return []

    cat_query = " OR ".join(f"cat:{cat}" for cat in valid_cats)

    # arXiv doesn't support date filtering directly, so we fetch more and filter
    params = {
        "search_query": cat_query,
        "start": 0,
        "max_results": max_results * 2,  # Fetch extra to account for date filtering
        "sortBy": "submittedDate",
        "sortOrder": "descending",
    }

    async def _fetch(c: httpx.AsyncClient) -> list[dict]:
        try:
            response = await c.get(ARXIV_API, params=params, timeout=30.0)
            if response.status_code != 200:
                return []

            papers = _parse_arxiv_response(response.text)

            # Filter by date
            cutoff = datetime.now(timezone.utc) - timedelta(days=days)
            filtered = []
            for paper in papers:
                if paper.get("published_date"):
                    try:
                        pub_date = datetime.fromisoformat(
                            paper["published_date"].replace("Z", "+00:00")
                        )
                        if pub_date >= cutoff:
                            filtered.append(paper)
                    except ValueError:
                        continue

            return filtered[:max_results]
        except httpx.RequestError:
            return []

    if client:
        return await _fetch(client)

    async with httpx.AsyncClient() as c:
        return await _fetch(c)
