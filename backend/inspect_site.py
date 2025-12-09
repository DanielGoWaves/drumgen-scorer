import httpx
import re
import asyncio

url = "https://dev-onla-drumgen-demo.waves.com/"

async def fetch():
    try:
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.get(url)
            content = response.text
            
            # Look for lists of drum kinds or categories in the JS
            print("Searching for drum kinds and parameters...")
            
            # Look for script tags to find external JS files
            scripts = re.findall(r'<script\s+src="([^"]+)"', content)
            print(f"Found scripts: {scripts}")
            
            # Search in main content
            missing_candidates = ["clap", "snap", "bongo", "conga", "timpani", "tabla", "taiko", "gong", "triangle", "woodblock", "claves", "maracas", "cabasa", "guiro", "vibraslap", "fx", "scratch", "impact"]
            found_missing = []
            for cand in missing_candidates:
                if cand in content.lower():
                    found_missing.append(cand)
            print(f"\nFound potential missing drum types in HTML: {found_missing}")

            # Fetch JS files to look deeper
            for script in scripts:
                if script.startswith("/"):
                    script_url = url.rstrip("/") + script
                elif script.startswith("http"):
                    script_url = script
                else:
                    script_url = url.rstrip("/") + "/" + script
                
                try:
                    print(f"Fetching {script_url}...")
                    script_resp = await client.get(script_url)
                    script_content = script_resp.text
                    
                    # Look for "Kind" array or object
                    # Often defined like: options: [...] or keys: [...]
                    
                    for cand in missing_candidates:
                        if cand in script_content.lower() and cand not in found_missing:
                            found_missing.append(cand)
                            
                except Exception as e:
                    print(f"Failed to fetch {script_url}: {e}")
            
            print(f"\nTotal potential missing drum types found: {found_missing}")

    except Exception as e:
        print(f"Error fetching site: {e}")

if __name__ == "__main__":
    asyncio.run(fetch())

