const fs = require('fs');
let file = fs.readFileSync('src/inngest/scrape-jobs.ts', 'utf8');

file = file.replace(
  /requirements: job\.requirements,/g,
  "requirements: job.requirements,\n          sector: job.sector,\n          profession: job.profession,\n          experience_level: job.experienceLevel,\n          education_level: job.educationLevel,\n          skills: job.skills,"
);

fs.writeFileSync('src/inngest/scrape-jobs.ts', file);
console.log('patched');
