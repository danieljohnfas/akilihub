let ldJson = $('script[type="application/ld+json"]').first().html() || '';
let data;
try { data = JSON.parse(ldJson); } catch (e) { data = null; }
let posting = null;
if (data && data['@graph']) {
  posting = data['@graph'].find(o => {
    const t = o['@type'];
    return Array.isArray(t) ? t.includes('BlogPosting') : t === 'BlogPosting';
  });
}
if (!posting) {
  // fallback: try to use meta tags as minimal data
  const title = $('meta[property="og:title"]').attr('content') || $('title').text();
  if (title) {
    posting = { headline: title };
  }
}
if (posting && posting.headline) {
  const job = {};
  job.title = (posting.headline || '').trim() || null;
  job.description = (posting.description || '').trim() || null;
  job.postedDateIsoString = (posting.datePublished || '').trim() || null;
  job.deadlineIsoString = (posting.dateModified || '').trim() || null;
  job.sourceUrl = $('meta[property="og:url"]').attr('content')?.trim() || null;

  // Extract company name from description if pattern exists
  if (job.description) {
    const compMatch = job.description.match(/Hiring Agency:\s*([^,|\n]+)/i);
    if (compMatch) job.companyName = compMatch[1].trim();
    const locMatch = job.description.match(/Location:\s*([^,|\n]+)/i);
    if (locMatch) job.location = locMatch[1].trim();
    const typeMatch = job.description.match(/\b(full[-\s]?time|part[-\s]?time|contract|internship|remote)\b/i);
    if (typeMatch) {
      const map = { 'full time': 'full_time', 'full-time': 'full_time', 'part time': 'part_time', 'part-time': 'part_time', contract: 'contract', internship: 'internship', remote: 'remote' };
      const key = typeMatch[0].toLowerCase().replace(/\s/g, '');
      job.jobType = map[key] || null;
    }
    const salaryMatch = job.description.match(/([\d,]+)\s*(?:-|\sto\s)?\s*([\d,]+)?\s*(USD|TZS|EUR|GBP)?/i);
    if (salaryMatch) {
      const min = parseInt(salaryMatch[1].replace(/,/g, ''), 10);
      const max = salaryMatch[2] ? parseInt(salaryMatch[2].replace(/,/g, ''), 10) : null;
      job.salaryMin = isNaN(min) ? null : min;
      job.salaryMax = max && !isNaN(max) ? max : null;
      job.salaryCurrency = salaryMatch[3] ? salaryMatch[3].toUpperCase() : null;
    }
  }

  // Only push if a clear title exists
  if (job.title) result.push(job);
}