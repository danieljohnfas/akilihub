// Extract title from meta og:title or <title>
let rawTitle = $('meta[property="og:title"]').attr('content') || $('title').text();
rawTitle = rawTitle ? rawTitle.trim() : '';

// Parse job title and company from patterns like "Apply now: <Job Title> at <Company>"
let titleMatch = rawTitle.match(/Apply\s+now:\s*([^@]+?)\s+at\s+([^—-]+?)(?:\s|–|$)/i);
let jobTitle = titleMatch ? titleMatch[1].trim() : rawTitle;
let companyName = titleMatch ? titleMatch[2].trim() : '';

// Fallback: if no "at" pattern, try extracting company after dash
if (!companyName && rawTitle.includes('–')) {
  let parts = rawTitle.split('–');
  if (parts.length > 1) {
    companyName = parts[0].split('at').pop().trim();
  }
}

// Description: main article/content area
let description = $('.post-body, .entry-content, article, .content').first().text().trim();

// Location: attempt to find city name after company in title (e.g., ", Dar es Salaam")
let location = '';
let locMatch = rawTitle.match(/,\s*([A-Za-z\s]+?)(?:\s|\(|$)/);
if (locMatch) location = locMatch[1].trim();

// Source URL from canonical link
let sourceUrl = $('link[rel="canonical"]').attr('href') || '';

// Build job object with available fields
let job = {
  title: jobTitle || undefined,
  companyName: companyName || undefined,
  description: description || undefined,
  location: location || undefined,
  jobType: undefined,
  sourceUrl: sourceUrl || undefined,
  postedDateIsoString: undefined,
  deadlineIsoString: undefined,
  salaryMin: undefined,
  salaryMax: undefined,
  salaryCurrency: undefined
};

// Only push if we have a plausible title
if (job.title) {
  result.push(job);
}