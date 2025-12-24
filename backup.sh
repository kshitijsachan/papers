#!/bin/bash
# Backup papers database to GitHub Gist

DB_PATH="$HOME/.papers/papers.db"

if [ ! -f "$DB_PATH" ]; then
    echo "No database found at $DB_PATH"
    exit 1
fi

# Create a base64-encoded backup (gists are text-based)
BACKUP_FILE="/tmp/papers_backup.sql"
sqlite3 "$DB_PATH" ".dump" > "$BACKUP_FILE"

TIMESTAMP=$(date +%Y-%m-%d_%H:%M:%S)
echo "-- Backup: $TIMESTAMP" | cat - "$BACKUP_FILE" > /tmp/papers_backup_final.sql
mv /tmp/papers_backup_final.sql "$BACKUP_FILE"

# Check if gist exists, create or update
GIST_ID_FILE="$HOME/.papers/.gist_id"

if [ -f "$GIST_ID_FILE" ]; then
    GIST_ID=$(cat "$GIST_ID_FILE")
    gh gist edit "$GIST_ID" "$BACKUP_FILE" -f "papers_backup.sql" && \
        echo "Updated backup gist: https://gist.github.com/$GIST_ID"
else
    # Create new private gist
    GIST_URL=$(gh gist create "$BACKUP_FILE" -d "Papers database backup" -f "papers_backup.sql" 2>&1)
    GIST_ID=$(echo "$GIST_URL" | grep -oE '[a-f0-9]{32}')
    echo "$GIST_ID" > "$GIST_ID_FILE"
    echo "Created backup gist: $GIST_URL"
fi

rm "$BACKUP_FILE"
echo "Backup complete: $TIMESTAMP"
