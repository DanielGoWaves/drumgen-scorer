#!/bin/bash
# Fully automated GitHub setup - just needs your PAT

set -e

REPO_NAME="drumgen-scorer"
EMAIL="Danielgo@waves.com"

echo "=========================================="
echo "GitHub Repository Auto-Setup"
echo "=========================================="
echo ""
echo "This script will:"
echo "  1. Create GitHub repository '$REPO_NAME'"
echo "  2. Push main branch"
echo "  3. Push dev branch"
echo ""
echo "You need a GitHub Personal Access Token."
echo "Get one here: https://github.com/settings/tokens/new"
echo "  - Name: 'DrumGen Scorer'"
echo "  - Scope: 'repo' (Full control)"
echo ""
read -sp "Enter your GitHub Personal Access Token: " TOKEN
echo ""

if [ -z "$TOKEN" ]; then
    echo "Error: No token provided"
    exit 1
fi

# Create repository
echo "Creating repository..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Authorization: token $TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$REPO_NAME\",\"description\":\"DrumGen Scorer - AI drum sample generation testing and scoring platform\",\"private\":false,\"auto_init\":false}" \
    https://api.github.com/user/repos)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "201" ]; then
    echo "Error creating repository. HTTP Code: $HTTP_CODE"
    echo "Response: $BODY"
    exit 1
fi

# Extract URLs
CLONE_URL=$(echo "$BODY" | grep -o '"clone_url":"[^"]*' | cut -d'"' -f4)
HTML_URL=$(echo "$BODY" | grep -o '"html_url":"[^"]*' | cut -d'"' -f4)
USERNAME=$(echo "$BODY" | grep -o '"login":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$CLONE_URL" ]; then
    CLONE_URL="https://github.com/${USERNAME}/${REPO_NAME}.git"
fi

echo "✓ Repository created: $HTML_URL"
echo ""

# Configure remote
echo "Configuring remote..."
git remote remove origin 2>/dev/null || true
git remote add origin "$CLONE_URL"

# Configure git to use token for this push
git remote set-url origin "https://${TOKEN}@github.com/${USERNAME}/${REPO_NAME}.git"

# Push main
echo "Pushing main branch..."
git checkout main
git push -u origin main

# Push dev
echo "Pushing dev branch..."
git checkout dev
git push -u origin dev

# Switch back to main
git checkout main

# Remove token from URL (for security)
git remote set-url origin "$CLONE_URL"

echo ""
echo "=========================================="
echo "✓ Success! Repository setup complete."
echo "=========================================="
echo "Repository: $HTML_URL"
echo "Main branch: pushed"
echo "Dev branch: pushed"
echo "=========================================="

