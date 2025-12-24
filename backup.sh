#!/bin/bash
# Backup papers database to GitHub Gist (only if changed)

DB_PATH="$HOME/.papers/papers.db"
HASH_FILE="$HOME/.papers/.last_backup_hash"

if [ ! -f "$DB_PATH" ]; then
    exit 0
fi

# Check if DB has changed since last backup
CURRENT_HASH=$(md5 -q "$DB_PATH")
LAST_HASH=$(cat "$HASH_FILE" 2>/dev/null)

if [ "$CURRENT_HASH" = "$LAST_HASH" ]; then
    exit 0  # No changes, skip backup
fi

# Create SQL dump
BACKUP_FILE="/tmp/papers_backup.sql"
sqlite3 "$DB_PATH" ".dump" > "$BACKUP_FILE"

TIMESTAMP=$(date +%Y-%m-%d_%H:%M:%S)
echo "-- Backup: $TIMESTAMP" | cat - "$BACKUP_FILE" > /tmp/papers_backup_final.sql
mv /tmp/papers_backup_final.sql "$BACKUP_FILE"

# Check if gist exists, create or update
GIST_ID_FILE="$HOME/.papers/.gist_id"

if [ -f "$GIST_ID_FILE" ]; then
    GIST_ID=$(cat "$GIST_ID_FILE")
    gh gist edit "$GIST_ID" "$BACKUP_FILE" -f "papers_backup.sql" >/dev/null 2>&1 && \
        echo "$CURRENT_HASH" > "$HASH_FILE" && \
        echo "Backed up: $TIMESTAMP"
else
    GIST_URL=$(gh gist create "$BACKUP_FILE" -d "Papers database backup" -f "papers_backup.sql" 2>&1)
    GIST_ID=$(echo "$GIST_URL" | grep -oE '[a-f0-9]{32}')
    if [ -n "$GIST_ID" ]; then
        echo "$GIST_ID" > "$GIST_ID_FILE"
        echo "$CURRENT_HASH" > "$HASH_FILE"
        echo "Created backup gist: $GIST_URL"
    fi
fi

rm "$BACKUP_FILE" 2>/dev/null
