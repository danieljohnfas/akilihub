let title = $('h1.entry-title, h1.post-title, h1').first().text().trim();
if (!title) { /* no clear job title, leave result empty */ }
else {
  let job = { title };
  // try to infer company name from title
  let compMatch = title.match(/at\s+([^,‑-]+)[,‑-]/i) || title.match(/at\s+(.+)$/i);
  if (compMatch) job.companyName = compMatch[1].trim();
  // description
  let desc = $('.entry-content').text().trim();
  if (desc) job.description = desc;
  // location (simple country list, extend as needed)
  let locMatch = (desc || '').match(/\b(Tanzania|Kenya|Uganda|Rwanda|South\s*Africa|USA|United\s*States|UK|United\s*Kingdom)\b/i);
  if (locMatch) job.location = locMatch[0];
  // job type
  let lowerDesc = (desc || '').toLowerCase();
  if (/\bfull[-\s]?time\b/.test(lowerDesc)) job.jobType = 'full_time';
  else if (/\bpart[-\s]?time\b/.test(lowerDesc)) job.jobType = 'part_time';
  else if (/\bcontract\b/.test(lowerDesc)) job.jobType = 'contract';
  else if (/\binternship\b/.test(lowerDesc)) job.jobType = 'internship';
  else if (/\bremote\b/.test(lowerDesc)) job.jobType = 'remote';
  // source URL
  let src = $('link[rel="canonical"]').attr('href') || $('meta[property="og:url"]').attr('content');
  if (src) job.sourceUrl = src;
  // posted date
  let posted = $('meta[property="article:published_time"]').attr('content');
  if (posted) job.postedDateIsoString = posted;
  // deadline – not present in sample, skip
  // salary extraction
  let salaryTokens = (desc || '').match(/[\$€£]\s?\d[\d,.]*/g);
  if (salaryTokens && salaryTokens.length) {
    let amounts = salaryTokens.map(t => parseFloat(t.replace(/[^0-9.]/g, ''))).filter(n => !isNaN(n));
    if (amounts.length) {
      job.salaryMin = Math.min(...amounts);
      job.salaryMax = Math.max(...amounts);
      let cur = salaryTokens[0].match(/[\$€£]/);
      if (cur) job.salaryCurrency = cur[0];
    }
  }
  result.push(job);
}