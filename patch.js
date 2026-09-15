const fs = require('fs');
let file = fs.readFileSync('src/lib/scrapers/broad-search-engine.ts', 'utf8');

file = file.replace(
  "- For 'requirements': Extract ALL qualifications and experience required: education level, years\n  of experience, specific skills, certifications, software tools, languages, and any other\n  criteria. Separate requirements with semicolons. Use empty string ONLY if truly none stated.",
  "- For 'requirements': Extract ALL qualifications and experience required.\n- For 'sector': The industry sector.\n- For 'profession': The specific profession or role category.\n- For 'experienceLevel': Infer the experience level as 'entry', 'mid', 'senior', or 'executive'.\n- For 'educationLevel': Required education.\n- For 'skills': List of technical or soft skills."
);

file = file.replace(
  "requirements: z.string(),\n          location: z.string(),",
  "requirements: z.string(),\n          sector: z.string().nullable().default(null),\n          profession: z.string().nullable().default(null),\n          experienceLevel: z.enum(['entry', 'mid', 'senior', 'executive', '']).default(''),\n          educationLevel: z.string().nullable().default(null),\n          skills: z.array(z.string()).default([]),\n          location: z.string(),"
);

file = file.replace(
  "requirements: string;\n      location: string;",
  "requirements: string; sector: string | null; profession: string | null; experienceLevel: string; educationLevel: string | null; skills: string[];\n      location: string;"
);

file = file.replace(
  "requirements: job.requirements,\n          regionId: regionId,",
  "requirements: job.requirements,\n          sector: job.sector,\n          profession: job.profession,\n          experienceLevel: job.experienceLevel || null,\n          educationLevel: job.educationLevel,\n          skills: job.skills,\n          regionId: regionId,"
);

fs.writeFileSync('src/lib/scrapers/broad-search-engine.ts', file);
console.log('patched');
