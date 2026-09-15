import time
import json
import random
from curl_cffi import requests
from bs4 import BeautifulSoup

def main():
    print("Starting python bulk extraction...")
    session = requests.Session(impersonate="chrome110")
    
    # Warm up the session to get Cloudflare cookies
    print("Warming up session...")
    r = session.get("https://www.brightermonday.co.ke/jobs", timeout=30)
    print("Warmup status:", r.status_code)
    
    all_jobs = []
    
    # Let's do 100 pages for now (3400 jobs)
    for page in range(1, 101):
        url = f"https://www.brightermonday.co.ke/jobs?page={page}"
        print(f"Fetching {url}...")
        try:
            r = session.get(url, timeout=20)
            soup = BeautifulSoup(r.text, 'html.parser')
            
            jobs_found = 0
            for a in soup.find_all('a', href=True):
                href = a['href']
                if '/listings/' in href:
                    title = a.get_text(strip=True)
                    if len(title) > 5 and len(title) < 150:
                        all_jobs.append({
                            "title": title,
                            "url": href
                        })
                        jobs_found += 1
                        
            print(f"Page {page} found {jobs_found} jobs.")
            
            if jobs_found == 0:
                print("No jobs found, Cloudflare might be blocking. Breaking.")
                break
                
            time.sleep(random.uniform(1, 3))
            
        except Exception as e:
            print(f"Error on page {page}: {e}")
            break

    # Save to JSON
    with open('python_jobs.json', 'w', encoding='utf-8') as f:
        json.dump(all_jobs, f)
        
    print(f"Successfully saved {len(all_jobs)} jobs to python_jobs.json")

if __name__ == "__main__":
    main()
