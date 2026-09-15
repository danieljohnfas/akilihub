const fs = require('fs');
let content = fs.readFileSync('src/lib/scrapers/broad-search-engine.ts', 'utf8');

const targetCatch = \} catch (err) {
    console.warn(\\\[extractJobsWithAI] AI extraction unavailable on \\\ (\\\).\\\);
    throw err; // RE-THROW so the main audit daemon can sleep if it's a rate limit!
  }\;

const newCatch = \} catch (err) {
    console.warn(\\\[extractJobsWithAI] AI extraction unavailable on \\\ (\\\). Falling back to deterministic.\\\);
    
    // FALLBACK IF AI FAILS
    if (deterministic && text.length > 100) {
      return [{
        title: "Job Listing",
        companyName: "Unknown",
        description: text.substring(0, 5000),
        requirements: deterministic.requirements || null,
        sector: "Other",
        profession: "Professionals",
        experienceLevel: "mid",
        educationLevel: "Upper Secondary Education",
        skills: [],
        regionId: null,
        jobType: "full_time",
        sourceUrl: sourceUrl,
        postedDate: new Date(),
        deadline: deterministic.deadline || null,
        salaryMin: deterministic.salaryMin || 0,
        salaryMax: deterministic.salaryMax || 0,
        salaryCurrency: deterministic.salaryCurrency || '',
        countryCode: deterministic.countryCode || '',
        needsAiExtraction: true // Flag to re-audit later when API keys work
      }];
    }
    return [];
  }\;

content = content.replace(targetCatch, newCatch);
fs.writeFileSync('src/lib/scrapers/broad-search-engine.ts', content);
console.log('Injected deterministic fallback.');
