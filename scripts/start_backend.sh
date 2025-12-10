#!/bin/bash
# Start backend server - always runs on main branch

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Get current branch
CURRENT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "unknown")

# Always checkout main before starting server
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Currently on branch '$CURRENT_BRANCH'"
    echo "🔄 Switching to main branch for server startup..."
    git checkout main
    echo "✓ Switched to main branch"
fi

# Remove DEV badge if present
if [ -f "scripts/manage_dev_badge.py" ]; then
    python3 scripts/manage_dev_badge.py remove 2>/dev/null || true
fi

# Activate virtual environment
if [ -d "backend/.venv" ]; then
    source backend/.venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Start backend server
echo "🚀 Starting backend server on main branch..."
uvicorn backend.main:app --reload --port 8000

