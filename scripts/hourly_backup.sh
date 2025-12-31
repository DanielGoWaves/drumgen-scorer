#!/bin/bash
# Hourly Database Backup Script
# Creates timestamped backups every hour

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/database_backups"
DB_FILE="$PROJECT_ROOT/drumgen.db"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create timestamp
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
BACKUP_FILE="$BACKUP_DIR/drumgen_${TIMESTAMP}.db"

# Create backup
if [ -f "$DB_FILE" ]; then
    cp "$DB_FILE" "$BACKUP_FILE"
    echo "[$(date)] ✓ Backup created: $BACKUP_FILE"
    
    # Keep only last 168 backups (1 week of hourly backups)
    cd "$BACKUP_DIR"
    ls -t drumgen_*.db | tail -n +169 | xargs -r rm --
    
    # Log backup stats
    COUNT=$(sqlite3 "$BACKUP_FILE" "SELECT COUNT(*) FROM test_results" 2>/dev/null || echo "0")
    echo "[$(date)] Database has $COUNT test results"
else
    echo "[$(date)] ❌ Database file not found: $DB_FILE"
    exit 1
fi
