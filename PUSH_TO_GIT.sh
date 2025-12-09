#!/bin/bash
# Script to push code to Git remote repository
# Replace YOUR_REPO_URL with your actual GitHub/GitLab repository URL

REPO_URL="YOUR_REPO_URL"  # Replace this with your actual repo URL

echo "Setting up remote repository..."
git remote add origin "$REPO_URL"

echo "Pushing main branch..."
git checkout main
git push -u origin main

echo "Pushing dev branch..."
git checkout dev
git push -u origin dev

echo "Setting main as default branch..."
git checkout main

echo "✓ Done! Both main and dev branches are now on remote."
echo ""
echo "Current branches:"
git branch -a

