#!/bin/bash
# Backup papers database to iCloud (or any folder you prefer)

BACKUP_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/papers-backup"
DB_PATH="$HOME/.papers/papers.db"
FIGURES_PATH="$HOME/.papers/figures"

mkdir -p "$BACKUP_DIR"

# Backup database with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp "$DB_PATH" "$BACKUP_DIR/papers_$TIMESTAMP.db" 2>/dev/null && \
  echo "Database backed up to $BACKUP_DIR/papers_$TIMESTAMP.db"

# Keep only last 10 backups
ls -t "$BACKUP_DIR"/papers_*.db 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null

# Optionally sync figures (can be large)
# rsync -av "$FIGURES_PATH/" "$BACKUP_DIR/figures/"

echo "Backup complete"
