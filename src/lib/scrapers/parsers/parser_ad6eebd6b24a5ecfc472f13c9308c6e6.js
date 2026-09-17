// Ensure source URL and possible company name are captured first
const sourceUrl = $('meta[property="og:url"]').attr('content') || '';
let companyName = '';
const titleTag = $('title').text().trim();
if (titleTag) {
  const compMatch = titleTag.match(/^([^‑|:-]+)(?:\s*[-|:]\s*| Vacanc| Jobs| Careers)/i);
  if (compMatch) companyName = compMatch[1].trim();
}

// Helper to clean text
const clean = (txt) => (txt || '').trim().replace(/\s+/g, ' ');

// Possible job‑type keywords mapping
const jobTypeMap = {
  fulltime: 'full_time',
  'full-time': 'full_time',
  parttime: 'part_time',
  'part-time': 'part_time',
  contract: 'contract',
  internship: 'internship',
  intern: 'internship',
  remote: 'remote',
};

// Regex for salary detection (e.g., $1,000 - $2,000 or USD 1000‑2000)
const salaryRegex = /(?:USD|EUR|GBP|\$|£|€)\s?([\d,]+)(?:\s?[-–]\s?(?:USD|EUR|GBP|\$|£|€)?\s?([\d,]+))?/i;

// Identify containers that likely hold the article content
const containers = $('.post-body, .entry-content, article, .content, .post, .page-body');

// Function to decide if a heading looks like a job title
const isJobTitle = (text) => {
  if (!text) return false;
  const lower = text.toLowerCase();
  // Must contain a typical role word or the word “vacancy”/“position”
  const roleKeywords = [
    'manager', 'engineer', 'officer', 'assistant', 'analyst',
    'specialist', 'coordinator', 'executive', 'consultant',
    'developer', 'intern', 'trainee', 'sales', 'marketing',
    'accountant', 'technician', 'designer', 'architect',
    'operator', 'supervisor', 'director', 'lead',
    'vacancy', 'position', 'opening', 'job',
  ];
  return roleKeywords.some((kw) => lower.includes(kw));
};

// Iterate over possible containers
containers.each((_, cont) => {
  const $cont = $(cont);

  // Look for headings that may represent individual jobs
  $cont.find('h1, h2, h3, h4, h5, h6').each((_, heading) => {
    const $heading = $(heading);
    const rawTitle = clean($heading.text());
    if (!isJobTitle(rawTitle)) return;

    // Gather description: all sibling elements until the next heading of same or higher level
    const descriptionParts = [];
    let $next = $heading.next();
    while ($next.length && !$next.is('h1, h2, h3, h4, h5, h6')) {
      if ($next.is('p, ul, ol, div')) descriptionParts.push(clean($next.text()));
      $next = $next.next();
    }
    const description = descriptionParts.join(' ');

    // Attempt to extract location (simple heuristic: look for city or country names)
    let location = '';
    const locationMatch = description.match(/\b(?:dar\s?es\s?salaam|dar\s?es\s?salama|dodoma|tanzania|kenya|uganda|nairobi|mombasa|london|new\s?york|sydney)\b/i);
    if (locationMatch) location = clean(locationMatch[0]);

    // Detect job type
    let jobType = '';
    const lowerDesc = description.toLowerCase();
    for (const key in jobTypeMap) {
      if (lowerDesc.includes(key)) {
        jobType = jobTypeMap[key];
        break;
      }
    }

    // Detect posted and deadline dates (ISO format if possible)
    let postedDateIsoString = '';
    let deadlineIsoString = '';
    const postedMatch = description.match(/posted\s*[:\-]?\s*(\d{1,2}\s*[A-Za-z]{3,9}\s*\d{4})/i);
    if (postedMatch) {
      const d = new Date(postedMatch[1]);
      if (!isNaN(d)) postedDateIsoString = d.toISOString();
    }
    const deadlineMatch = description.match(/deadline\s*[:\-]?\s*(\d{1,2}\s*[A-Za-z]{3,9}\s*\d{4})/i);
    if (deadlineMatch) {
      const d = new Date(deadlineMatch[1]);
      if (!isNaN(d)) deadlineIsoString = d.toISOString();
    }

    // Salary extraction
    let salaryMin = null;
    let salaryMax = null;
    let salaryCurrency = null;
    const salaryMatch = description.match(salaryRegex);
    if (salaryMatch) {
      salaryCurrency = salaryMatch[0].match(/USD|EUR|GBP|\$|£|€/i)[0];
      salaryMin = Number(salaryMatch[1].replace(/,/g, ''));
      if (salaryMatch[2]) salaryMax = Number(salaryMatch[2].replace(/,/g, ''));
      else salaryMax = salaryMin;
    }

    // Build job object
    const job = {
      title: rawTitle,
      companyName: companyName,
      description: description,
      location: location,
      jobType: jobType,
      sourceUrl: sourceUrl,
      postedDateIsoString: postedDateIsoString,
      deadlineIsoString: deadlineIsoString,
      salaryMin: salaryMin,
      salaryMax: salaryMax,
      salaryCurrency: salaryCurrency,
    };
    result.push(job);
  });
});

// If no jobs were detected, result stays empty (as required)