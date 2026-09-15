import sys
import json
from datasets import load_dataset
import pandas as pd

def fetch_datasets():
    print("Downloading Tenders...")
    ds_tenders = load_dataset("derhan/indonesia-gov-procurement", split="train")
    df_tenders = ds_tenders.to_pandas().head(10000)
    
    tenders = []
    for _, row in df_tenders.iterrows():
        tenders.append({
            "title": str(row.get("title", "")),
            "reference_no": str(row.get("id", "")),
            "procuring_entity": str(row.get("agency", "")),
            "description": str(row.get("description", "")) or "Public procurement contract details available on source site.",
            "source_url": str(row.get("url", "")) or "https://inaproc.id",
            "status": "open"
        })
    with open("dataset_tenders.json", "w", encoding="utf-8") as f:
        json.dump(tenders, f)
    print(f"Saved {len(tenders)} tenders.")

    print("Downloading Companies (Businesses)...")
    ds_comp = load_dataset("tracki/companies-dataset", split="train")
    df_comp = ds_comp.to_pandas().head(10000)
    
    companies = []
    for _, row in df_comp.iterrows():
        companies.append({
            "name": str(row.get("name", "")),
            "industry": str(row.get("industry", "")),
            "description": str(row.get("description", "")) or "Company details available.",
            "website": str(row.get("website", "")),
            "address": str(row.get("location", "")) or "Registered Address",
            "registration_number": str(row.get("id", ""))
        })
    with open("dataset_businesses.json", "w", encoding="utf-8") as f:
        json.dump(companies, f)
    print(f"Saved {len(companies)} companies.")

if __name__ == "__main__":
    fetch_datasets()
