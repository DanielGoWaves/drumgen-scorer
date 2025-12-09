#!/bin/bash
# Setup GitHub repository and push code
# Usage: ./setup_github.sh YOUR_GITHUB_TOKEN

set -e

REPO_NAME="drumgen-scorer"
GITHUB_TOKEN="${1:-}"

if [ -z "$GITHUB_TOKEN" ]; then
    echo "Usage: ./setup_github.sh YOUR_GITHUB_TOKEN"
    echo ""
    echo "To create a Personal Access Token:"
    echo "1. Go to: https://github.com/settings/tokens/new"
    echo "2. Name it: 'DrumGen Scorer Setup'"
    echo "3. Select scope: 'repo' (Full control of private repositories)"
    echo "4. Generate token and copy it"
    echo "5. Run: ./setup_github.sh YOUR_TOKEN_HERE"
    exit 1
fi

echo "Creating GitHub repository '$REPO_NAME'..."

# Create repository using GitHub API
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
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

# Extract clone URL from response
REPO_URL=$(echo "$BODY" | grep -o '"clone_url":"[^"]*' | cut -d'"' -f4)

if [ -z "$REPO_URL" ]; then
    # Fallback: construct URL from username
    USERNAME=$(echo "$BODY" | grep -o '"login":"[^"]*' | head -1 | cut -d'"' -f4)
    REPO_URL="https://github.com/${USERNAME}/${REPO_NAME}.git"
fi

echo "✓ Repository created: $REPO_URL"
echo ""

# Configure git remote
echo "Setting up remote..."
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

# Push main branch
echo "Pushing main branch..."
git checkout main
git push -u origin main

# Push dev branch
echo "Pushing dev branch..."
git checkout dev
git push -u origin dev

# Switch back to main
git checkout main

echo ""
echo "✓ Success! Repository setup complete."
echo "  Repository: https://github.com/${REPO_URL##*/}"
echo "  Main branch: pushed"
echo "  Dev branch: pushed"

