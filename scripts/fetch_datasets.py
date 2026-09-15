import sys
import json
from datasets import load_dataset
import pandas as pd

def fetch_jobs():
    print("Downloading jobs dataset...")
    # xanderios/linkedin-job-postings has ~33,000 rows
    ds = load_dataset("xanderios/linkedin-job-postings", split="train")
    df = ds.to_pandas()
    
    # We need 30,000 jobs to reach 50,000
    df = df.head(30000)
    
    jobs = []
    for _, row in df.iterrows():
        jobs.append({
            "title": str(row.get("job_title", "")),
            "company_name": str(row.get("company", "")),
            "description": str(row.get("job_summary", "")),
            "source_url": str(row.get("job_link", "")),
            "job_type": str(row.get("job_type", "")),
            "location": str(row.get("job_location", "")),
            "skills": str(row.get("job_skills", ""))
        })
        
    with open("dataset_jobs.json", "w", encoding="utf-8") as f:
        json.dump(jobs, f)
    print(f"Saved {len(jobs)} jobs.")

if __name__ == "__main__":
    fetch_jobs()
