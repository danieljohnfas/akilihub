// Extract JobPosting data from JSON‑LD scripts
$('script[type="application/ld+json"]').each((_, elem) => {
  let json;
  try {
    json = JSON.parse($(elem).contents().text());
  } catch (e) {
    return;
  }
  const collect = (obj) => {
    if (Array.isArray(obj)) {
      obj.forEach(collect);
    } else if (obj && typeof obj === 'object') {
      if (obj['@type'] === 'JobPosting') {
        const job = {};
        if (obj.title) job.title = String(obj.title).trim();
        if (obj.hiringOrganization && obj.hiringOrganization.name) job.companyName = String(obj.hiringOrganization.name).trim();
        if (obj.description) job.description = String(obj.description).trim();
        if (obj.jobLocation && obj.jobLocation.address) {
          const addr = obj.jobLocation.address;
          const parts = [];
          if (addr.streetAddress) parts.push(addr.streetAddress);
          if (addr.addressLocality) parts.push(addr.addressLocality);
          if (addr.addressRegion) parts.push(addr.addressRegion);
          if (addr.addressCountry) parts.push(addr.addressCountry);
          job.location = parts.join(', ');
        }
        if (obj.employmentType) {
          const type = String(obj.employmentType).toLowerCase();
          if (type.includes('full')) job.jobType = 'full_time';
          else if (type.includes('part')) job.jobType = 'part_time';
          else if (type.includes('contract')) job.jobType = 'contract';
          else if (type.includes('intern')) job.jobType = 'internship';
          else if (type.includes('remote')) job.jobType = 'remote';
        }
        if (obj.url) job.sourceUrl = String(obj.url).trim();
        if (obj.datePosted) job.postedDateIsoString = new Date(obj.datePosted).toISOString();
        if (obj.validThrough) job.deadlineIsoString = new Date(obj.validThrough).toISOString();
        if (obj.baseSalary) {
          const sal = obj.baseSalary;
          if (sal.value) {
            const val = sal.value;
            if (val.minValue) job.salaryMin = Number(val.minValue);
            if (val.maxValue) job.salaryMax = Number(val.maxValue);
            if (val.currency) job.salaryCurrency = String(val.currency);
          }
        }
        result.push(job);
      } else {
        // recurse into nested objects/arrays
        Object.values(obj).forEach(collect);
      }
    }
  };
  collect(json);
});

// Fallback: if no jobs extracted, try to infer a single posting from meta tags and page content
if (result.length === 0) {
  const metaTitle = $('meta[property="og:title"]').attr('content') || $('title').text();
  const metaDesc = $('meta[name="description"]').attr('content') || '';
  const metaUrl = $('link[rel="canonical"]').attr('href') || $('meta[property="og:url"]').attr('content') || '';
  const metaDate = $('meta[property="article:published_time"]').attr('content') || '';
  const h1 = $('h1').first().text().trim();
  const possibleTitle = h1 || metaTitle;
  if (possibleTitle && /job|vacancy|position|manager|engineer|assistant|associate/i.test(possibleTitle)) {
    const job = {
      title: possibleTitle.trim(),
      description: $('.entry-content, .post-content, article').text().trim() || metaDesc.trim(),
      sourceUrl: metaUrl.trim()
    };
    if (metaDate) job.postedDateIsoString = new Date(metaDate).toISOString();
    // Attempt to extract location from page text
    const locMatch = $('body').text().match(/Location\s*[:\-]\s*([^\n]+)/i);
    if (locMatch) job.location = locMatch[1].trim();
    // Simple heuristic for employment type
    const bodyText = $('body').text().toLowerCase();
    if (bodyText.includes('full time')) job.jobType = 'full_time';
    else if (bodyText.includes('part time')) job.jobType = 'part_time';
    else if (bodyText.includes('contract')) job.jobType = 'contract';
    else if (bodyText.includes('intern')) job.jobType = 'internship';
    else if (bodyText.includes('remote')) job.jobType = 'remote';
    result.push(job);
  }
}