const sourceUrl = $('meta[property="og:url"]').attr('content') || '';

$('h2, h3').each(function () {
  const title = $(this).text().trim();
  if (!title) return;
  const lower = title.toLowerCase();
  // Skip generic page headings when they appear to be the only heading
  if (lower.includes('career') && lower.includes('opportun') && $('h2, h3').length === 1) return;

  const descriptionElems = $(this).nextUntil('h2, h3');
  const description = descriptionElems
    .map((i, el) => $(el).text().trim())
    .get()
    .join('\n')
    .trim();

  const job = { title, sourceUrl };
  if (description) job.description = description;

  const companyMatch = description.match(/company[:\s]\s*([^\n,|-]+)/i);
  if (companyMatch) job.companyName = companyMatch[1].trim();

  const locationMatch = description.match(/location[:\s]\s*([^\n,|-]+)/i);
  if (locationMatch) job.location = locationMatch[1].trim();

  const typeMatch = description.match(/type[:\s]\s*(full[-\s]?time|part[-\s]?time|contract|internship|remote)/i);
  if (typeMatch) {
    const map = {
      fulltime: 'full_time',
      parttime: 'part_time',
      contract: 'contract',
      internship: 'internship',
      remote: 'remote'
    };
    const key = typeMatch[1].toLowerCase().replace(/[-\s]/g, '');
    job.jobType = map[key] || key;
  }

  const postedMeta = $('meta[property="article:published_time"], meta[name="date"], time[datetime]').first();
  const posted = postedMeta.attr('content') || postedMeta.attr('datetime');
  if (posted) {
    const iso = new Date(posted).toISOString();
    if (!isNaN(Date.parse(iso))) job.postedDateIsoString = iso;
  }

  const deadlineMeta = $('meta[property="article:expiration_time"], meta[name="expiry-date"], time[datetime][class*="deadline"]').first();
  const deadline = deadlineMeta.attr('content') || deadlineMeta.attr('datetime');
  if (deadline) {
    const iso = new Date(deadline).toISOString();
    if (!isNaN(Date.parse(iso))) job.deadlineIsoString = iso;
  }

  const salaryMatch = description.match(/salary[:\s]\s*([\d,]+)\s*[-–]\s*([\d,]+)\s*([A-Z]{3})?/i);
  if (salaryMatch) {
    job.salaryMin = Number(salaryMatch[1].replace(/,/g, ''));
    job.salaryMax = Number(salaryMatch[2].replace(/,/g, ''));
    if (salaryMatch[3]) job.salaryCurrency = salaryMatch[3];
  }

  result.push(job);
});