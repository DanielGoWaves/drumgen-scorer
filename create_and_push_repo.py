#!/usr/bin/env python3
"""
Create GitHub repository and push code.
Note: GitHub API requires a Personal Access Token (PAT), not password.
"""
import subprocess
import sys
import json
import getpass

def create_repo_with_api(repo_name, token):
    """Create repository using GitHub API."""
    import urllib.request
    import urllib.error
    
    url = "https://api.github.com/user/repos"
    data = json.dumps({
        "name": repo_name,
        "description": "DrumGen Scorer - AI drum sample generation testing and scoring platform",
        "private": False,
        "auto_init": False
    }).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers={
        "Authorization": f"token {token}",
        "Content-Type": "application/json",
        "Accept": "application/vnd.github.v3+json"
    })
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result.get('clone_url') or result.get('html_url').replace('https://github.com/', 'https://github.com/').replace('.git', '') + '.git'
    except urllib.error.HTTPError as e:
        error_data = e.read().decode('utf-8')
        print(f"Error creating repository: {e.code}")
        print(f"Response: {error_data}")
        return None

def main():
    repo_name = "drumgen-scorer"
    
    print("=" * 60)
    print("GitHub Repository Setup")
    print("=" * 60)
    print("\nGitHub API requires a Personal Access Token (PAT), not password.")
    print("If you don't have one, create it at:")
    print("https://github.com/settings/tokens/new")
    print("\nRequired scopes: 'repo' (full control of private repositories)")
    print("\n" + "-" * 60)
    
    token = getpass.getpass("Enter your GitHub Personal Access Token: ")
    
    if not token:
        print("No token provided. Exiting.")
        sys.exit(1)
    
    print(f"\nCreating repository '{repo_name}'...")
    repo_url = create_repo_with_api(repo_name, token)
    
    if not repo_url:
        print("\nFailed to create repository. Please check your token and try again.")
        sys.exit(1)
    
    print(f"✓ Repository created: {repo_url}")
    
    # Add remote and push
    print("\nSetting up remote and pushing branches...")
    
    commands = [
        ["git", "remote", "add", "origin", repo_url],
        ["git", "checkout", "main"],
        ["git", "push", "-u", "origin", "main"],
        ["git", "checkout", "dev"],
        ["git", "push", "-u", "origin", "dev"],
        ["git", "checkout", "main"],
    ]
    
    for cmd in commands:
        print(f"Running: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error: {result.stderr}")
            sys.exit(1)
        if result.stdout:
            print(result.stdout)
    
    print("\n" + "=" * 60)
    print("✓ Success! Repository created and code pushed.")
    print(f"  Main branch: {repo_url}")
    print(f"  Dev branch: {repo_url} (dev)")
    print("=" * 60)

if __name__ == "__main__":
    main()

