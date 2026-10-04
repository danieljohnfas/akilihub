// Helper to trim and normalize text
const clean = (str) => (str || '').trim().replace(/\s+/g, ' ');

// Get source URL from common meta tags
const sourceUrl = $('link[rel="canonical"]').attr('href') || $('meta[property="og:url"]').attr('content') || '';

// Function to attempt date parsing from a string
const parseDate = (text) => {
  const match = text.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!match) return null;
  const date = new Date(`${match[1]} ${match[2]} ${match[3]}`);
  return isNaN(date.getTime()) ? null : date.toISOString();
};

// Function to extract salary information
const extractSalary = (text) => {
  const salary = { salaryMin: null, salaryMax: null, salaryCurrency: null };
  const match = text.match(/([\$€£¥])\s?([\d,]+)(?:\s?-\s?([\$€£¥])?\s?([\d,]+))?/);
  if (match) {
    salary.salaryCurrency = match[1];
    salary.salaryMin = Number(match[2].replace(/,/g, ''));
    if (match[4]) {
      salary.salaryMax = Number(match[4].replace(/,/g, ''));
      if (!match[3]) salary.salaryCurrency = salary.salaryCurrency;
    }
  }
  return salary;
};

// Keywords that likely indicate a job title
const titleKeywords = /(engineer|technician|manager|officer|analyst|surveyor|material|construction|planner|designer|architect|supervisor)/i;

// Collect headings that look like job titles
$('h2, h3, h4').each((_, elem) => {
  const title = clean($(elem).text());
  if (!title || !titleKeywords.test(title)) return;

  // Gather description from siblings until the next heading of same level or higher
  let descriptionParts = [];
  let sibling = $(elem).next();
  while (sibling.length && !/^h[2-4]$/i.test(sibling[0].tagName)) {
    if (sibling.is('p, ul, ol')) descriptionParts.push(clean(sibling.text()));
    sibling = sibling.next();
  }
  const description = descriptionParts.join('\n').trim();
  if (!description) return; // skip if no details

  const job = { title, description, sourceUrl };

  // Attempt to extract location
  const locMatch = description.match(/(?:location|based in|city|place)[:\s]+([A-Za-z\s]+)/i);
  if (locMatch) job.location = clean(locMatch[1]);
  else if (/Dodoma/i.test(description)) job.location = 'Dodoma';

  // Job type mapping
  const typeMap = {
    'full time': 'full_time',
    'part time': 'part_time',
    contract: 'contract',
    internship: 'internship',
    remote: 'remote'
  };
  for (const [key, val] of Object.entries(typeMap)) {
    if (new RegExp(key, 'i').test(description)) {
      job.jobType = val;
      break;
    }
  }

  // Posted date (first date found in the whole page)
  const postedIso = parseDate(html);
  if (postedIso) job.postedDateIsoString = postedIso;

  // Deadline (look for words like "deadline" followed by a date)
  const deadlineMatch = html.match(/deadline[:\s]*\b(\d{1,2}\s+[A-Za-z]+\s+\d{4})\b/i);
  if (deadlineMatch) {
    const deadlineIso = parseDate(deadlineMatch[1]);
    if (deadlineIso) job.deadlineIsoString = deadlineIso;
  }

  // Salary extraction
  const salaryInfo = extractSalary(description);
  if (salaryInfo.salaryMin !== null) {
    job.salaryMin = salaryInfo.salaryMin;
    job.salaryMax = salaryInfo.salaryMax;
    job.salaryCurrency = salaryInfo.salaryCurrency;
  }

  // Company name – try to locate a preceding element that may contain it
  const possibleCompany = $(elem).prevAll('h1, .post-title, .blog-posts h2').first().text();
  if (possibleCompany) job.companyName = clean(possibleCompany);

  result.push(job);
});

// Fallback: look for list items that contain a job‑like title
if (result.length === 0) {
  $('li').each((_, li) => {
    const text = clean($(li).text());
    if (!titleKeywords.test(text)) return;
    const parts = text.split('–');
    const title = clean(parts[0]);
    if (!title) return;
    const job = { title, description: clean(parts.slice(1).join('–')), sourceUrl };
    // Simple location detection within the same line
    if (/Dodoma/i.test(text)) job.location = 'Dodoma';
    result.push(job);
  });
}

// Ensure result is an array (already defined) – no further action needed.