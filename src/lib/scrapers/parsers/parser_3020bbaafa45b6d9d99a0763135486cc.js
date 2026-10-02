// Helper to extract text safely
function getText(elem) {
  return elem && typeof elem.text === 'function' ? elem.text().trim() : '';
}

// Extract source URL from meta or link rel canonical
let sourceUrl = '';
const canonical = $('link[rel="canonical"]').attr('href');
if (canonical) sourceUrl = canonical;
else {
  const ogUrl = $('meta[property="og:url"]').attr('content');
  if (ogUrl) sourceUrl = ogUrl;
}

// Extract posted date from meta
let postedDateIsoString = $('meta[property="article:published_time"]').attr('content') || '';
let modifiedDateIsoString = $('meta[property="article:modified_time"]').attr('content') || '';

// Possible job containers
const containers = $('article, .job, .job-item, .post, .entry-content, .job-listing').toArray();

containers.forEach((el) => {
  const container = $(el);

  // Find a heading that could be the job title
  const titleElem = container.find('h1, h2, h3, h4').first();
  const title = getText(titleElem);
  if (!title) return; // skip if no clear title

  // Description: try to get a paragraph block after the title
  let description = '';
  const descCandidates = container.find('p, .description, .job-description, .entry-content').toArray();
  if (descCandidates.length) {
    description = descCandidates.map((d) => getText($(d))).filter(Boolean).join('\n');
  }

  // Company name
  let companyName = '';
  const companySelectors = ['.company, .company-name, .employer, .posted-by, .author-name'];
  companySelectors.forEach((sel) => {
    if (!companyName) {
      const txt = getText(container.find(sel).first());
      if (txt) companyName = txt.replace(/^by\s+/i, '').trim();
    }
  });

  // Location
  let location = '';
  const locText = container.text();
  const locMatch = locText.match(/Location[:\s]*([\w\s,.-]+)/i);
  if (locMatch) location = locMatch[1].trim();

  // Job type
  let jobType = '';
  const typeMap = {
    'full time': 'full_time',
    'full-time': 'full_time',
    'part time': 'part_time',
    'part-time': 'part_time',
    contract: 'contract',
    internship: 'internship',
    remote: 'remote',
  };
  const typeFound = Object.keys(typeMap).find((k) => new RegExp(k, 'i').test(locText));
  if (typeFound) jobType = typeMap[typeFound.toLowerCase()];

  // Salary extraction
  let salaryMin = null;
  let salaryMax = null;
  let salaryCurrency = null;
  const salaryMatch = locText.match(/([\$€£¥])?\s?([\d,.]+)\s?(?:-|\sto\s)?\s*([\$€£¥])?\s?([\d,.]+)/);
  if (salaryMatch) {
    salaryCurrency = salaryMatch[1] || salaryMatch[3] || null;
    const min = parseFloat(salaryMatch[2].replace(/,/g, ''));
    const max = parseFloat(salaryMatch[4].replace(/,/g, ''));
    if (!isNaN(min)) salaryMin = min;
    if (!isNaN(max)) salaryMax = max;
  }

  // Deadline
  let deadlineIsoString = '';
  const deadlineMatch = locText.match(/Deadline[:\s]*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  if (deadlineMatch) deadlineIsoString = deadlineMatch[1];

  const job = {
    title,
    companyName: companyName || undefined,
    description: description || undefined,
    location: location || undefined,
    jobType: jobType || undefined,
    sourceUrl: sourceUrl || undefined,
    postedDateIsoString: postedDateIsoString || undefined,
    deadlineIsoString: deadlineIsoString || undefined,
    salaryMin: salaryMin !== null ? salaryMin : undefined,
    salaryMax: salaryMax !== null ? salaryMax : undefined,
    salaryCurrency: salaryCurrency || undefined,
  };

  // Remove undefined keys
  Object.keys(job).forEach((k) => job[k] === undefined && delete job[k]);

  result.push(job);
});

// If no job objects were added, ensure result stays empty
if (result.length === 0) {
  // keep result as empty array
}