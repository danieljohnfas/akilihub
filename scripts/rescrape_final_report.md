
# Rescrape Final Report (Full Run)

## Previously Completed
- **Jobs Updated**: 981
- **Tenders Updated**: 26
- **Compliance Updated**: 143

## This Run (2026-08-03T08:52:39.008Z)
- **Health Data Points Upserted**: 225
  - Source: World Bank Open Data API + WHO Global Health Observatory
  - Indicators: MMR, U5MR, HIV_PREV, TB_INC, LIFE_EXP, UHC_INDEX, DPT_VACC, ANC_VISITS, HEALTH_EXP, MALARIA_INC, STUNTING, SBA
  - Countries: KE, TZ, UG, RW, ET, CD
- **Salaries Inserted**: 198
  - Source: AI Broad Search (Google → scrape → AI extract)
  - Countries: KE, TZ, UG, RW, ET, CD

## Notes
- Health data now sourced from official APIs (World Bank + WHO), not web scraping.
- Old seeded salary data (from seed-salaries.ts) remains; new AI-scraped data is additive.
