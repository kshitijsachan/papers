"""FastAPI application for paper management."""

import hashlib
import json
import os
import re
import shutil
import subprocess
import threading
import xml.etree.ElementTree as ET
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

import anthropic
import httpx
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlmodel import Session, select

from arxiv_client import get_recent_papers
from database import DATA_DIR, create_db_and_tables, get_session
from models import NotesUpdate, Paper, PaperCreate, PaperRead, PaperUpdate
from papers_with_code import get_code_url_from_abstract
from semantic_scholar import get_recommendations as ss_get_recommendations
from semantic_scholar import search_paper

ARXIV_API = "https://export.arxiv.org/api/query"
DB_PATH = DATA_DIR / "papers.db"
HASH_FILE = DATA_DIR / ".last_backup_hash"
BACKUP_SCRIPT = Path(__file__).parent.parent / "backup.sh"

# Debounced backup - waits 5 seconds after last edit before backing up
_backup_timer: threading.Timer | None = None
_backup_lock = threading.Lock()


def trigger_backup():
    """Trigger a debounced backup (5 second delay)."""
    global _backup_timer
    with _backup_lock:
        if _backup_timer:
            _backup_timer.cancel()
        _backup_timer = threading.Timer(5.0, _run_backup)
        _backup_timer.start()


def _run_backup():
    """Run the backup script."""
    if BACKUP_SCRIPT.exists():
        env = {
            "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/sbin",
            "HOME": str(Path.home()),
        }
        result = subprocess.run(
            ["/bin/bash", str(BACKUP_SCRIPT)],
            capture_output=True,
            text=True,
            env=env,
        )
        if result.returncode != 0:
            print(f"Backup failed: {result.stderr}", flush=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    create_db_and_tables()
    yield


app = FastAPI(title="Paper Management API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/sync-status")
def get_sync_status() -> dict:
    """Check if database is synced with backup."""
    if not DB_PATH.exists():
        return {"synced": True, "message": "No database yet"}

    current_hash = hashlib.md5(DB_PATH.read_bytes()).hexdigest()
    last_hash = HASH_FILE.read_text().strip() if HASH_FILE.exists() else None

    return {
        "synced": current_hash == last_hash,
        "last_backup": last_hash is not None,
    }


@app.get("/papers", response_model=list[PaperRead])
def list_papers(
    q: str | None = None,
    sort: str = "created_at",
    order: str = "desc",
    session: Session = Depends(get_session),
) -> list[Paper]:
    """List all saved papers with optional filtering and sorting.

    Parameters
    ----------
    q : str | None
        Optional search query to filter by title or author.
    sort : str
        Field to sort by: 'created_at' (default), 'title', or 'read_status'.
    order : str
        Sort order: 'asc' or 'desc' (default).
    session : Session
        Database session.

    Returns
    -------
    list[Paper]
        List of papers matching the criteria.
    """
    query = select(Paper)

    if q:
        search_term = f"%{q}%"
        query = query.where(
            (Paper.title.ilike(search_term)) | (Paper.authors.ilike(search_term))
        )

    sort_field = {
        "created_at": Paper.created_at,
        "title": Paper.title,
        "read_status": Paper.read_status,
    }.get(sort, Paper.created_at)

    if order == "asc":
        query = query.order_by(sort_field.asc())
    else:
        query = query.order_by(sort_field.desc())

    return list(session.exec(query).all())


@app.post("/papers", response_model=PaperRead, status_code=201)
def create_paper(
    paper: PaperCreate, session: Session = Depends(get_session)
) -> Paper:
    """Save a paper to the database.

    Parameters
    ----------
    paper : PaperCreate
        Paper data to save.
    session : Session
        Database session.

    Returns
    -------
    Paper
        The saved paper.
    """
    db_paper = Paper.model_validate(paper)
    session.add(db_paper)
    session.commit()
    session.refresh(db_paper)
    trigger_backup()
    return db_paper


@app.patch("/papers/{paper_id}", response_model=PaperRead)
def update_paper(
    paper_id: int, paper_update: PaperUpdate, session: Session = Depends(get_session)
) -> Paper:
    """Update a paper's read status.

    Parameters
    ----------
    paper_id : int
        ID of the paper to update.
    paper_update : PaperUpdate
        Update data.
    session : Session
        Database session.

    Returns
    -------
    Paper
        The updated paper.

    Raises
    ------
    HTTPException
        If the paper is not found.
    """
    paper = session.get(Paper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    if paper_update.read_status is not None:
        paper.read_status = paper_update.read_status
    if paper_update.published_date is not None:
        paper.published_date = paper_update.published_date
    session.add(paper)
    session.commit()
    session.refresh(paper)
    trigger_backup()
    return paper


@app.delete("/papers/{paper_id}", status_code=204)
def delete_paper(paper_id: int, session: Session = Depends(get_session)) -> None:
    """Delete a paper from the database.

    Parameters
    ----------
    paper_id : int
        ID of the paper to delete.
    session : Session
        Database session.

    Raises
    ------
    HTTPException
        If the paper is not found.
    """
    paper = session.get(Paper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    session.delete(paper)
    session.commit()
    trigger_backup()


def parse_arxiv_response(xml_text: str) -> list[dict]:
    """Parse arXiv API XML response into paper dicts."""

    ns = {
        "atom": "http://www.w3.org/2005/Atom",
        "arxiv": "http://arxiv.org/schemas/atom",
    }

    root = ET.fromstring(xml_text)
    papers = []

    for entry in root.findall("atom:entry", ns):
        title_el = entry.find("atom:title", ns)
        title = title_el.text.strip().replace("\n", " ") if title_el is not None else ""

        summary_el = entry.find("atom:summary", ns)
        abstract = summary_el.text.strip() if summary_el is not None else None

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
            "url": arxiv_url,
            "arxiv_url": arxiv_url,
            "arxiv_id": arxiv_id,
            "published_date": published_date,
        })

    return papers


@app.get("/search")
async def search_papers(query: str) -> list[dict]:
    """Search for papers using arXiv API.

    Parameters
    ----------
    query : str
        Search query string.

    Returns
    -------
    list[dict]
        List of papers matching the query.

    Raises
    ------
    HTTPException
        If the search request fails.
    """
    params = {
        "search_query": f"all:{query}",
        "start": 0,
        "max_results": 20,
        "sortBy": "relevance",
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(ARXIV_API, params=params, timeout=30.0)

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail="Failed to search arXiv",
        )

    return parse_arxiv_response(response.text)


@app.get("/papers/{paper_id}/notes")
def get_paper_notes(paper_id: int, session: Session = Depends(get_session)) -> dict:
    """Get notes for a paper.

    Parameters
    ----------
    paper_id : int
        ID of the paper.
    session : Session
        Database session.

    Returns
    -------
    dict
        Notes content.

    Raises
    ------
    HTTPException
        If the paper is not found.
    """
    paper = session.get(Paper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return {"notes": paper.notes}


@app.put("/papers/{paper_id}/notes")
def update_paper_notes(
    paper_id: int, notes_update: NotesUpdate, session: Session = Depends(get_session)
) -> dict:
    """Update notes for a paper.

    Parameters
    ----------
    paper_id : int
        ID of the paper.
    notes_update : NotesUpdate
        Notes content.
    session : Session
        Database session.

    Returns
    -------
    dict
        Updated notes content.

    Raises
    ------
    HTTPException
        If the paper is not found.
    """
    paper = session.get(Paper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    paper.notes = notes_update.notes
    session.add(paper)
    session.commit()
    session.refresh(paper)
    trigger_backup()
    return {"notes": paper.notes}


def extract_arxiv_id(arxiv_url: str | None) -> str | None:
    """Extract arXiv ID from an arXiv URL.

    Parameters
    ----------
    arxiv_url : str | None
        The arXiv URL (e.g., 'http://arxiv.org/abs/2301.12345v1').

    Returns
    -------
    str | None
        The arXiv ID (e.g., '2301.12345') or None if not extractable.
    """
    if not arxiv_url:
        return None
    match = re.search(r"(\d{4}\.\d{4,5})(v\d+)?", arxiv_url)
    return match.group(1) if match else None


# Cache directory for extracted figures
FIGURES_CACHE_DIR = DATA_DIR / "figures"
FIGURES_CACHE_DIR.mkdir(parents=True, exist_ok=True)


def extract_figures_from_pdf(pdf_path: Path, cache_dir: Path) -> list[dict]:
    """Extract figures from a PDF using Marker.

    Uses Marker's ML-based figure detection to extract figures with captions.

    Parameters
    ----------
    pdf_path : Path
        Path to the PDF file.
    cache_dir : Path
        Directory to cache extracted figures.

    Returns
    -------
    list[dict]
        List of figures with image URLs and captions.
    """
    cache_dir.mkdir(parents=True, exist_ok=True)

    # Run marker_single CLI
    result = subprocess.run(
        [
            "uv", "run", "marker_single",
            str(pdf_path),
            "--output_dir", str(cache_dir),
        ],
        capture_output=True,
        text=True,
        cwd=Path(__file__).parent,
    )

    if result.returncode != 0:
        raise RuntimeError(f"Marker failed: {result.stderr}")

    # Find the output directory (marker creates a subdirectory)
    output_dirs = [d for d in cache_dir.iterdir() if d.is_dir()]
    if not output_dirs:
        # Marker might output directly to cache_dir
        output_dir = cache_dir
    else:
        output_dir = output_dirs[0]

    # Find all extracted images
    figures = []
    image_files = sorted(output_dir.glob("*.jpeg")) + sorted(output_dir.glob("*.png"))

    # Try to extract captions from the markdown file
    captions = {}
    md_files = list(output_dir.glob("*.md"))
    if md_files:
        md_content = md_files[0].read_text()
        # Look for figure references like ![](_page_1_Figure_0.jpeg) followed by caption
        pattern = r'!\[\]\(([^)]+)\)\s*\n\s*(Figure\s*\d+[^!\n]*)'
        for match in re.finditer(pattern, md_content, re.IGNORECASE):
            img_name = match.group(1)
            caption = match.group(2).strip()
            captions[img_name] = caption

    for img_file in image_files:
        # Skip if it's not a figure (e.g., starts with _page)
        if not img_file.name.startswith("_page"):
            continue

        # Move/copy to cache_dir root for simpler serving
        dest = cache_dir / img_file.name
        if img_file != dest:
            shutil.copy(img_file, dest)

        # Extract page number from filename like _page_1_Figure_0.jpeg
        page_match = re.search(r'_page_(\d+)_', img_file.name)
        page_num = int(page_match.group(1)) if page_match else 0

        caption = captions.get(img_file.name, f"Figure from page {page_num}")

        figures.append({
            "image_url": f"/figures/{cache_dir.name}/{img_file.name}",
            "caption": caption,
            "page": page_num,
        })

    # Sort by page number
    figures.sort(key=lambda f: f["page"])
    return figures


@app.get("/papers/{paper_id}/figures")
async def get_paper_figures(
    paper_id: int, session: Session = Depends(get_session)
) -> list[dict]:
    """Extract figures from paper PDF with caching.

    Parameters
    ----------
    paper_id : int
        ID of the paper.
    session : Session
        Database session.

    Returns
    -------
    list[dict]
        List of figures with 'image_url' and 'caption' keys.
    """
    paper = session.get(Paper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    arxiv_id = extract_arxiv_id(paper.arxiv_url)
    if not arxiv_id:
        raise HTTPException(status_code=400, detail="Paper has no valid arXiv URL")

    # Check cache first
    cache_dir = FIGURES_CACHE_DIR / arxiv_id
    metadata_path = cache_dir / "metadata.json"

    if metadata_path.exists():
        # Return cached figures
        with open(metadata_path) as f:
            return json.load(f)

    # Download PDF from arXiv
    pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(pdf_url, timeout=60.0, follow_redirects=True)
        except httpx.RequestError:
            raise HTTPException(status_code=502, detail="Failed to download PDF")

    if response.status_code != 200:
        raise HTTPException(status_code=404, detail="PDF not available")

    # Save PDF temporarily
    cache_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = cache_dir / "paper.pdf"
    with open(pdf_path, "wb") as f:
        f.write(response.content)

    # Extract figures
    try:
        figures = extract_figures_from_pdf(pdf_path, cache_dir)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract figures: {e}")

    # Cache metadata
    with open(metadata_path, "w") as f:
        json.dump(figures, f)

    # Clean up PDF (optional - keep if you want to re-extract later)
    # pdf_path.unlink()

    return figures


# Serve cached figure images
@app.get("/figures/{arxiv_id}/{filename}")
async def get_figure_image(arxiv_id: str, filename: str):
    """Serve a cached figure image.

    Parameters
    ----------
    arxiv_id : str
        The arXiv ID of the paper.
    filename : str
        The filename of the figure.

    Returns
    -------
    FileResponse
        The figure image file.
    """
    file_path = FIGURES_CACHE_DIR / arxiv_id / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Figure not found")

    # Determine media type
    ext = filename.split(".")[-1].lower()
    media_types = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
    }
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(file_path, media_type=media_type)


# Recommendations caching
RECS_CACHE_FILE = DATA_DIR / "recommendations_cache.json"
RECS_CACHE_TTL = 3600  # 1 hour


def _get_cached_recommendations() -> dict | None:
    """Get cached recommendations if still valid."""
    if not RECS_CACHE_FILE.exists():
        return None
    try:
        data = json.loads(RECS_CACHE_FILE.read_text())
        generated_at = datetime.fromisoformat(data["generated_at"])
        age = (datetime.now(timezone.utc) - generated_at).total_seconds()
        if age < RECS_CACHE_TTL:
            return data
    except (json.JSONDecodeError, KeyError, ValueError):
        pass
    return None


def _cache_recommendations(data: dict) -> None:
    """Cache recommendations to file."""
    RECS_CACHE_FILE.write_text(json.dumps(data, default=str))


async def _score_papers_with_claude(
    library_papers: list[dict],
    candidate_papers: list[dict],
) -> list[dict]:
    """Use Claude to score and explain paper relevance.

    Parameters
    ----------
    library_papers : list[dict]
        User's saved papers with title and abstract.
    candidate_papers : list[dict]
        Candidate papers to score.

    Returns
    -------
    list[dict]
        Scored papers with 'score' and 'explanation' fields added.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        # No API key - return papers without scoring
        for p in candidate_papers:
            p["score"] = 5.0
            p["explanation"] = "Claude scoring unavailable (no API key)"
        return candidate_papers[:20]

    # Build library summary
    library_summary = "\n".join(
        f"- {p['title']}" for p in library_papers[:50]  # Limit to avoid token overflow
    )

    # Build candidate list
    candidates_text = "\n\n".join(
        f"[{i}] {p['title']}\nAuthors: {p.get('authors', 'Unknown')}\nAbstract: {(p.get('abstract') or '')[:500]}"
        for i, p in enumerate(candidate_papers[:40])  # Limit candidates
    )

    prompt = f"""You are helping a machine learning researcher find relevant papers.

The researcher's library contains these papers:
{library_summary}

Score these candidate papers for relevance (1-10, where 10 = extremely relevant):

{candidates_text}

For each paper, respond with exactly one line in this format:
INDEX|SCORE|EXPLANATION

Where INDEX is the number in brackets, SCORE is 1-10, and EXPLANATION is a brief reason.
Only include papers scoring 5 or above. Example:
0|8|Directly addresses quantization methods for transformers
3|7|Related work on model compression

Start your response with the first scored paper (no preamble):"""

    client = anthropic.AsyncAnthropic(api_key=api_key)

    try:
        response = await client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = response.content[0].text

        # Parse pipe-delimited format
        result = []
        seen_indices = set()
        for line in response_text.strip().split("\n"):
            line = line.strip()
            if not line or "|" not in line:
                continue
            parts = line.split("|", 2)
            if len(parts) < 3:
                continue
            try:
                idx = int(parts[0].strip().strip("[]"))
                score = float(parts[1].strip())
                explanation = parts[2].strip()
            except (ValueError, IndexError):
                continue
            if idx < 0 or idx >= len(candidate_papers) or idx in seen_indices:
                continue
            seen_indices.add(idx)
            paper = candidate_papers[idx].copy()
            paper["score"] = score
            paper["explanation"] = explanation
            result.append(paper)

        # Sort by score descending
        result.sort(key=lambda x: x["score"], reverse=True)
        return result[:20]

    except Exception as e:
        print(f"Claude scoring failed: {e}", flush=True)
        # Fallback: return unsorted with default scores
        for p in candidate_papers[:20]:
            p["score"] = 5.0
            p["explanation"] = "Scoring unavailable"
        return candidate_papers[:20]


@app.get("/recommendations")
async def get_recommendations_endpoint(
    refresh: bool = False,
    session: Session = Depends(get_session),
) -> dict:
    """Get paper recommendations based on user's library.

    Parameters
    ----------
    refresh : bool
        Force refresh recommendations, ignoring cache.
    session : Session
        Database session.

    Returns
    -------
    dict
        Recommendations with 'new_papers' and 'related_papers' lists.
    """
    # Check cache first
    if not refresh:
        cached = _get_cached_recommendations()
        if cached:
            return cached

    # Get user's library
    papers = list(session.exec(select(Paper)).all())
    if not papers:
        return {
            "new_papers": [],
            "related_papers": [],
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "message": "Add papers to your library to get recommendations",
        }

    # Prepare library data for Claude
    library_data = [
        {"title": p.title, "abstract": p.abstract, "arxiv_url": p.arxiv_url}
        for p in papers
    ]

    # Get existing arxiv IDs to filter out
    existing_arxiv_ids = set()
    for p in papers:
        if p.arxiv_url:
            match = re.search(r"(\d{4}\.\d{4,5})", p.arxiv_url)
            if match:
                existing_arxiv_ids.add(match.group(1))

    async with httpx.AsyncClient() as client:
        # Fetch recent arXiv papers
        new_candidates = await get_recent_papers(
            categories=["cs.LG", "cs.CL", "cs.AI", "stat.ML"],
            days=3,
            max_results=50,
            client=client,
        )

        # Filter out papers already in library
        new_candidates = [
            p for p in new_candidates
            if p.get("arxiv_id") and p["arxiv_id"] not in existing_arxiv_ids
        ]

        # Get Semantic Scholar recommendations
        related_candidates = []
        ss_paper_ids = []

        # Get SS IDs for a sample of user's papers
        sample_papers = papers[:10]  # Use first 10 papers as seeds
        for p in sample_papers:
            if p.arxiv_url:
                match = re.search(r"(\d{4}\.\d{4,5})", p.arxiv_url)
                if match:
                    ss_id = await search_paper(match.group(1), client=client)
                    if ss_id:
                        ss_paper_ids.append(ss_id)

        if ss_paper_ids:
            ss_recs = await ss_get_recommendations(ss_paper_ids, limit=30, client=client)
            for rec in ss_recs:
                arxiv_id = None
                if rec.get("externalIds", {}).get("ArXiv"):
                    arxiv_id = rec["externalIds"]["ArXiv"]

                if arxiv_id and arxiv_id in existing_arxiv_ids:
                    continue

                # Get publication date (prefer full date, fall back to year)
                pub_date = rec.get("publicationDate")
                if not pub_date and rec.get("year"):
                    pub_date = f"{rec['year']}-01-01"

                related_candidates.append({
                    "title": rec.get("title", ""),
                    "authors": ", ".join(a.get("name", "") for a in rec.get("authors", [])[:5]),
                    "abstract": rec.get("abstract", ""),
                    "arxiv_id": arxiv_id,
                    "arxiv_url": f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else rec.get("url"),
                    "url": f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else rec.get("url"),
                    "published_date": pub_date,
                    "citation_count": rec.get("citationCount", 0),
                })

        # Score papers with Claude (in parallel)
        import asyncio
        scored_new, scored_related = await asyncio.gather(
            _score_papers_with_claude(library_data, new_candidates),
            _score_papers_with_claude(library_data, related_candidates),
        )

        # Extract code URLs from abstracts
        for paper in scored_new + scored_related:
            code_url = get_code_url_from_abstract(paper.get("abstract"))
            if code_url:
                paper["code_url"] = code_url

    # Build response
    result = {
        "new_papers": [
            {
                "title": p["title"],
                "authors": p.get("authors", ""),
                "abstract": p.get("abstract", ""),
                "arxiv_id": p.get("arxiv_id", ""),
                "arxiv_url": p.get("arxiv_url") or p.get("url", ""),
                "published_date": p.get("published_date", ""),
                "relevance_score": p.get("score", 5),
                "explanation": p.get("explanation", ""),
                "code_url": p.get("code_url"),
                "source": "arxiv_daily",
            }
            for p in scored_new
        ],
        "related_papers": [
            {
                "title": p["title"],
                "authors": p.get("authors", ""),
                "abstract": p.get("abstract", ""),
                "arxiv_id": p.get("arxiv_id", ""),
                "arxiv_url": p.get("arxiv_url") or p.get("url", ""),
                "published_date": p.get("published_date", ""),
                "relevance_score": p.get("score", 5),
                "explanation": p.get("explanation", ""),
                "code_url": p.get("code_url"),
                "citation_count": p.get("citation_count", 0),
                "source": "semantic_scholar",
            }
            for p in scored_related
        ],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    # Cache results
    _cache_recommendations(result)

    return result


@app.get("/papers/{paper_id}/code-url")
def get_paper_code_url(
    paper_id: int, session: Session = Depends(get_session)
) -> dict:
    """Get GitHub code URL for a paper by extracting from abstract.

    Parameters
    ----------
    paper_id : int
        ID of the paper.
    session : Session
        Database session.

    Returns
    -------
    dict
        Dictionary with 'code_url' key (may be null).
    """
    paper = session.get(Paper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    code_url = get_code_url_from_abstract(paper.abstract)
    return {"code_url": code_url}


@app.post("/papers/code-urls")
def get_papers_code_urls(
    paper_ids: list[int], session: Session = Depends(get_session)
) -> dict[str, str | None]:
    """Get GitHub code URLs for multiple papers by extracting from abstracts.

    Parameters
    ----------
    paper_ids : list[int]
        List of paper IDs.
    session : Session
        Database session.

    Returns
    -------
    dict[str, str | None]
        Dictionary mapping paper ID (as string) to code URL.
    """
    results: dict[str, str | None] = {}

    for pid in paper_ids:
        paper = session.get(Paper, pid)
        if not paper:
            results[str(pid)] = None
            continue
        results[str(pid)] = get_code_url_from_abstract(paper.abstract)

    return results
