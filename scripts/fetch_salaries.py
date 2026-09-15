import sys
import json
from datasets import load_dataset
import pandas as pd

def fetch_salaries():
    print("Downloading Salaries...")
    ds = load_dataset("james-burton/data_scientist_salary_ordinal", split="train")
    df = ds.to_pandas().head(10040)
    
    salaries = []
    for _, row in df.iterrows():
        salaries.append({
            "job_title": str(row.get("job_title_category", "")) or "Data Professional",
            "experience_level": "mid",
            "employment_type": "full_time",
            "currency": "USD",
            "gross_monthly_salary": str(row.get("salary_in_usd", "50000")),
            "years_of_experience": 3
        })
    with open("dataset_salaries.json", "w", encoding="utf-8") as f:
        json.dump(salaries, f)
    print(f"Saved {len(salaries)} salaries.")

if __name__ == "__main__":
    fetch_salaries()
