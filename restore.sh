#!/bin/bash
# Restore papers database from GitHub Gist backup

DB_PATH="$HOME/.papers/papers.db"
GIST_ID_FILE="$HOME/.papers/.gist_id"

if [ ! -f "$GIST_ID_FILE" ]; then
    echo "No backup gist ID found. Run backup.sh first or provide gist ID:"
    echo "  ./restore.sh <gist_id>"
    exit 1
fi

GIST_ID=${1:-$(cat "$GIST_ID_FILE")}

echo "Downloading backup from gist $GIST_ID..."
BACKUP_SQL=$(gh gist view "$GIST_ID" -f "papers_backup.sql")

if [ -z "$BACKUP_SQL" ]; then
    echo "Failed to download backup"
    exit 1
fi

# Backup current DB if it exists
if [ -f "$DB_PATH" ]; then
    mv "$DB_PATH" "$DB_PATH.old"
    echo "Moved existing DB to $DB_PATH.old"
fi

# Restore
mkdir -p "$(dirname "$DB_PATH")"
echo "$BACKUP_SQL" | sqlite3 "$DB_PATH"

echo "Restored database to $DB_PATH"
