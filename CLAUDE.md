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

**One command for everything:**
```bash
papers        # starts if needed, opens browser
papers --dev  # kills existing, hot reload, foreground (Ctrl+C to stop)
```

**If the site goes down:**
```bash
papers --dev
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
