#!/bin/bash
# Safe Git Commit - Ensures database is NOT committed

echo "=== SAFE GIT COMMIT SCRIPT ==="
echo ""

# Check current database status
echo "1. Checking database status..."
DB_COUNT=$(sqlite3 drumgen.db "SELECT COUNT(*) FROM test_results")
echo "   Current database has $DB_COUNT test results"

# Make sure database is in .gitignore
echo ""
echo "2. Ensuring database is protected..."

# Check if *.db is in .gitignore
if grep -q "^\*.db$" .gitignore 2>/dev/null; then
    echo "   ✓ Database already ignored in .gitignore"
else
    echo "   Adding *.db to .gitignore..."
    echo "" >> .gitignore
    echo "# Database files (DO NOT COMMIT)" >> .gitignore
    echo "*.db" >> .gitignore
    echo "*.db-*" >> .gitignore
    echo "   ✓ Database protection added"
fi

# Remove database from git if it's tracked
echo ""
echo "3. Removing database from git tracking..."
if git ls-files | grep -q "\.db$"; then
    echo "   ⚠️  Database is being tracked! Removing from git..."
    git rm --cached drumgen.db 2>/dev/null || true
    git rm --cached *.db 2>/dev/null || true
    git rm --cached *.db-* 2>/dev/null || true
    echo "   ✓ Database removed from git tracking"
else
    echo "   ✓ Database is not tracked by git"
fi

# Show what will be committed
echo ""
echo "4. Files that will be committed:"
git status --short

echo ""
echo "5. Database verification:"
echo "   Before commit: $DB_COUNT test results"

# Ready to commit
echo ""
echo "=== READY TO COMMIT ==="
echo ""
echo "Your database with $DB_COUNT results is SAFE and will NOT be committed."
echo ""
echo "To commit, run:"
echo "  git add ."
echo "  git commit -m 'Your commit message'"
echo "  git push"
echo ""
echo "Your database will remain at $DB_COUNT results."

