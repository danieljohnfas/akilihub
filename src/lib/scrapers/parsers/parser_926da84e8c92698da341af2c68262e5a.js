const job = {};

// Title
const ogTitle = $('meta[property="og:title"]').attr('content');
job.title = ogTitle ? ogTitle.trim() : $('title').text().trim();

// If no clear title, treat as non‑job page
if (!job.title) {
  // leave result empty
} else {
  // Description
  const ogDesc = $('meta[property="og:description"]').attr('content');
  if (ogDesc) {
    job.description = ogDesc.trim();
  } else {
    const articleText = $('.entry-content').text().trim();
    if (articleText) job.description = articleText;
  }

  // Source URL
  const canonical = $('link[rel="canonical"]').attr('href');
  if (canonical) job.sourceUrl = canonical.trim();

  // Posted date
  const pubMeta = $('meta[property="article:published_time"]').attr('content');
  if (pubMeta) job.postedDateIsoString = pubMeta.trim();

  // Try JSON‑LD for additional fields
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html());
      const graph = json['@graph'] || (Array.isArray(json) ? json : []);
      const articleObj = graph.find(item => item['@type'] === 'Article');
      if (articleObj) {
        if (!job.title && articleObj.headline) job.title = articleObj.headline.trim();
        if (!job.postedDateIsoString && articleObj.datePublished) job.postedDateIsoString = articleObj.datePublished.trim();
        if (!job.description && articleObj.description) job.description = articleObj.description.trim();
        if (!job.sourceUrl && articleObj.url) job.sourceUrl = articleObj.url.trim();
      }
    } catch (e) {
      // ignore malformed JSON‑LD
    }
  });

  // Location (simple heuristic)
  const bodyText = $('.entry-content').text();
  const locationMatch = bodyText && bodyText.match(/based in\s+([A-Za-z ,]+)/i);
  if (locationMatch) job.location = locationMatch[1].trim();

  // Job type (full_time, part_time, contract, internship, remote)
  const typeText = (bodyText || '').toLowerCase();
  if (/full[-\s]?time/.test(typeText)) job.jobType = 'full_time';
  else if (/part[-\s]?time/.test(typeText)) job.jobType = 'part_time';
  else if (/contract/.test(typeText)) job.jobType = 'contract';
  else if (/internship/.test(typeText)) job.jobType = 'internship';
  else if (/remote/.test(typeText)) job.jobType = 'remote';

  // Salary (very naive extraction)
  const salaryMatches = bodyText && bodyText.match(/(\$|£|€)?\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)[\s-–]+(\$|£|€)?\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/);
  if (salaryMatches) {
    const currency = salaryMatches[1] || salaryMatches[3] || null;
    const min = parseFloat(salaryMatches[2].replace(/,/g, ''));
    const max = parseFloat(salaryMatches[4].replace(/,/g, ''));
    if (!isNaN(min)) job.salaryMin = min;
    if (!isNaN(max)) job.salaryMax = max;
    if (currency) job.salaryCurrency = currency;
  }

  // Company name (look for meta author or byline)
  const authorMeta = $('meta[name="author"]').attr('content');
  if (authorMeta) job.companyName = authorMeta.trim();
  else {
    const byline = $('.byline, .author, .post-author').first().text().trim();
    if (byline) job.companyName = byline;
  }

  // Push only if we have at least a title
  result.push(job);
}