# Papers

A local-first paper management app for ML researchers. Search arXiv, save papers to your library, view figures, and take notes.

## Quick Start

```bash
./start.sh
```

Opens at http://localhost:5173

## Requirements

- Python 3.11+
- Node.js 18+
- [uv](https://github.com/astral-sh/uv) (Python package manager)
- [gh](https://cli.github.com/) (GitHub CLI, for backups)

## Installation

```bash
# Backend
cd backend && uv sync

# Frontend
cd frontend && npm install
```

## Backup & Restore

Your data is stored in `~/.papers/`. Back it up to a private GitHub Gist:

```bash
./backup.sh
```

To restore on a new machine:

```bash
git clone git@github.com:kshitijsachan/papers.git
cd papers
./restore.sh    # Downloads DB from your gist
./start.sh
```

The gist ID is saved in `~/.papers/.gist_id`. If you lose it, find your gist at https://gist.github.com (look for `papers_backup.sql`).

## Features

- Search papers on arXiv by title/author
- Save papers to a local SQLite database
- Mark papers as read/unread
- View figures extracted from PDFs (using Marker)
- Take markdown notes on each paper
- Keyboard shortcuts for fast navigation

## Keyboard Shortcuts

- `/` - Focus arXiv search
- `f` - Focus library filter
- `j/k` - Navigate papers
- `Enter` - Open selected paper
- `r` - Toggle read status
- `Escape` - Close modal
- `←/→` - Navigate figures in lightbox

## Data Storage

- Database: `~/.papers/papers.db`
- Figures: `~/.papers/figures/`
- Backup gist ID: `~/.papers/.gist_id`
