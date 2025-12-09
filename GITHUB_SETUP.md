# GitHub Repository Setup

## Quick Setup (Once you have a Personal Access Token)

1. **Create a Personal Access Token:**
   - Go to: https://github.com/settings/tokens/new
   - Name: "DrumGen Scorer Setup"
   - Expiration: Choose your preference (90 days, 1 year, or no expiration)
   - Scopes: Check **"repo"** (Full control of private repositories)
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again!)

2. **Run this command:**
   ```bash
   ./setup_github.sh YOUR_TOKEN_HERE
   ```

   Or if you prefer a one-liner:
   ```bash
   TOKEN="YOUR_TOKEN_HERE" && \
   curl -X POST -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github.v3+json" \
   -d '{"name":"drumgen-scorer","description":"DrumGen Scorer - AI drum sample generation testing and scoring platform","private":false}' \
   https://api.github.com/user/repos && \
   git remote add origin https://github.com/YOUR_USERNAME/drumgen-scorer.git && \
   git checkout main && git push -u origin main && \
   git checkout dev && git push -u origin dev && \
   git checkout main
   ```

## What's Already Done Locally

✅ Git repository initialized
✅ Initial commit created
✅ Main branch created
✅ Dev branch created
✅ All code committed

## What Remains

- Create GitHub repository (requires PAT)
- Push main branch to remote
- Push dev branch to remote

Once you run the script with your token, everything will be pushed automatically!

