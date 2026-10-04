try {
  // Helper to safely get text
  const getText = (elem) => (elem && $(elem).first().text().trim()) || '';

  // Find a potential title element
  let titleElem = $('h1, .post-title, .entry-title, h2').filter(function () {
    const txt = $(this).text().toLowerCase();
    return /job|vacancy|opening|position/.test(txt);
  }).first();

  const rawTitle = getText(titleElem);
  if (!rawTitle) {
    // No obvious job title, leave result empty
    return;
  }

  // Try to parse title, company and location from the raw title string
  let title = '';
  let companyName = '';
  let location = '';

  // Example pattern: "Human Resources Assistant Job Vacancy at Twiga Cement – Dar es Salaam"
  const titleRegex = /^([\w\s\-\&]+?)\s+(?:job\s+vacancy|job\s+opening|position|opening)\s*(?:at\s+([\w\s\&\-\']+))?(?:[–-]\s*([\w\s,]+))?$/i;
  const m = rawTitle.match(titleRegex);
  if (m) {
    title = m[1].trim();
    if (m[2]) companyName = m[2].trim();
    if (m[3]) location = m[3].trim();
  } else {
    // Fallback: use the whole string as title
    title = rawTitle;
  }

  // Description: collect the main article/content text
  const contentSelectors = ['article', '.post-body', '.entry-content', '.content', '#main'];
  let description = '';
  for (const sel of contentSelectors) {
    const txt = $(sel).text().trim();
    if (txt.length > 100) { // assume meaningful content
      description = txt;
      break;
    }
  }

  // Source URL
  let sourceUrl = $('link[rel="canonical"]').attr('href') || $('meta[property="og:url"]').attr('content') || '';

  // Posted date (look for meta tags)
  let postedDateIsoString = $('meta[property="article:published_time"]').attr('content') || '';
  if (postedDateIsoString) {
    const d = new Date(postedDateIsoString);
    if (!isNaN(d)) postedDateIsoString = d.toISOString();
  }

  // Deadline (search for "before <date>" in description)
  let deadlineIsoString = '';
  const deadlineMatch = description.match(/before\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
  if (deadlineMatch) {
    const d = new Date(deadlineMatch[1]);
    if (!isNaN(d)) deadlineIsoString = d.toISOString();
  }

  // Salary extraction (simple range with currency)
  let salaryMin = null,
    salaryMax = null,
    salaryCurrency = null;
  const salaryMatch = description.match(/([£$€])\s?(\d{1,3}(?:[,\d]*\d)?)(?:\s*[-–]\s*([£$€]?)\s?(\d{1,3}(?:[,\d]*\d)?))?/);
  if (salaryMatch) {
    salaryCurrency = salaryMatch[1];
    salaryMin = parseInt(salaryMatch[2].replace(/,/g, ''), 10);
    if (salaryMatch[3]) {
      const cur2 = salaryMatch[3] || salaryCurrency;
      const maxVal = parseInt(salaryMatch[4].replace(/,/g, ''), 10);
      if (!isNaN(maxVal)) {
        salaryCurrency = cur2;
        salaryMax = maxVal;
      }
    }
  }

  // Job type detection
  const descLower = description.toLowerCase();
  let jobType = null;
  if (/\bfull[-\s]?time\b/.test(descLower)) jobType = 'full_time';
  else if (/\bpart[-\s]?time\b/.test(descLower)) jobType = 'part_time';
  else if (/\bcontract\b/.test(descLower)) jobType = 'contract';
  else if (/\binternship\b/.test(descLower)) jobType = 'internship';
  else if (/\bremote\b/.test(descLower)) jobType = 'remote';

  // Build job object
  const job = {
    title,
    companyName,
    description,
    location,
    jobType,
    sourceUrl,
    postedDateIsoString,
    deadlineIsoString,
    salaryMin,
    salaryMax,
    salaryCurrency,
  };

  // Remove undefined or null keys
  Object.keys(job).forEach(k => {
    if (job[k] === '' || job[k] === null || job[k] === undefined) delete job[k];
  });

  result.push(job);
} catch (e) {
  // In case of any unexpected error, keep result empty
}