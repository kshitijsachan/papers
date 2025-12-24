# Papers App

A paper management app (Paperpile alternative) for tracking ML research papers.

## Architecture

- **Backend**: FastAPI + SQLModel, runs on port 8000
  - `/Users/kshitij/code/misc/papers/backend/`
  - Database: `~/.papers/papers.db` (SQLite)
  - Key files: `main.py` (routes), `models.py` (schemas), `semantic_scholar.py`, `arxiv_client.py`

- **Frontend**: React + Vite + TailwindCSS, runs on port 5173
  - `/Users/kshitij/code/misc/papers/frontend/`
  - Key files: `src/components/`, `src/hooks/usePapers.ts`

## Development

**For dev work (with hot reload):**
```bash
cd /Users/kshitij/code/misc/papers && ./start.sh
```
This kills existing processes and starts with `--reload` for hot reloading.

**For normal usage:** User types `papers` in terminal - starts services if needed and opens browser.

**If the site goes down:**
```bash
lsof -ti:8000 | xargs kill -9; lsof -ti:5173 | xargs kill -9
./start.sh
```

## Key Features

- Search papers via arXiv API
- Recommendations via Semantic Scholar + Claude scoring
- Code URLs extracted from paper abstracts (not GitHub search)
- Figures extracted from PDFs via Marker
- Auto-backup to iCloud on changes

## Code Style

- Python: Use `python -m pytest`, numpydoc docstrings, Python 3.9+ typing (`list[int]` not `List[int]`)
- Leave newline at end of files
