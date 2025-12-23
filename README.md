# Papers

A local-first paper management app for ML researchers. Search arXiv, save papers to your library, view figures, and take notes.

## Features

- Search papers on arXiv by title/author
- Save papers to a local SQLite database
- Mark papers as read/unread
- View figures extracted from PDFs (using Marker)
- Take markdown notes on each paper
- Keyboard shortcuts for fast navigation

## Requirements

- Python 3.11+
- Node.js 18+
- [uv](https://github.com/astral-sh/uv) (Python package manager)

## Installation

### Backend

```bash
cd backend
uv sync
```

### Frontend

```bash
cd frontend
npm install
```

## Running

### Start the backend (port 8000)

```bash
cd backend
uv run uvicorn main:app --reload
```

### Start the frontend (port 5173)

```bash
cd frontend
npm run dev
```

Then open http://localhost:5173

## Usage

1. Use the search bar to find papers on arXiv
2. Click "Add" to save a paper to your library
3. Click a paper to view details, figures, and notes
4. Use checkboxes to select multiple papers for bulk actions

### Keyboard Shortcuts

- `/` - Focus arXiv search
- `f` - Focus library filter
- `j/k` - Navigate papers
- `Enter` - Open selected paper
- `r` - Toggle read status
- `Escape` - Close modal
- `←/→` - Navigate figures in lightbox

## Data Storage

- Database: `backend/papers.db`
- Figure cache: `~/.papers/figures/`
