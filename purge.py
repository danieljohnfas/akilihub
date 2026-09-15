import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('.env.remote')
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

# Purge any jobs with 'Unknown' as companyName
cur.execute("DELETE FROM jobs WHERE company_name = 'Unknown';")
print(f"Purged {cur.rowcount} bad jobs.")

# Delete synthetic tenders if any
cur.execute("DELETE FROM tenders WHERE category = 'services' AND description = '';")

conn.commit()
cur.close()
conn.close()
