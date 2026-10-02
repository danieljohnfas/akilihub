// Find and parse all JSON‑LD scripts
let jobPostings = [];

$('script[type="application/ld+json"]').each((_, el) => {
  let jsonText = $(el).contents().first().text().trim();
  if (!jsonText) return;
  try {
    let data = JSON.parse(jsonText);
    // If @graph exists, iterate its items
    if (Array.isArray(data['@graph'])) {
      data['@graph'].forEach(item => {
        if (item['@type'] && (Array.isArray(item['@type']) ? item['@type'].includes('JobPosting') : item['@type'] === 'JobPosting')) {
          jobPostings.push(item);
        }
      });
    } else if (data['@type'] && (Array.isArray(data['@type']) ? data['@type'].includes('JobPosting') : data['@type'] === 'JobPosting')) {
      jobPostings.push(data);
    }
  } catch (e) {
    // ignore malformed JSON
  }
});

// Fallback: if no JobPosting found, try to infer from meta tags (single posting page)
if (jobPostings.length === 0) {
  const ogTitle = $('meta[property="og:title"]').attr('content');
  if (ogTitle && ogTitle.toLowerCase().includes('job')) {
    const fallback = {
      title: ogTitle,
      description: $('meta[property="og:description"]').attr('content') || '',
      url: $('meta[property="og:url"]').attr('content') || '',
      datePosted: $('meta[property="article:published_time"]').attr('content') || '',
    };
    jobPostings.push(fallback);
  }
}

// Helper to normalize employment type
function normalizeJobType(val) {
  if (!val) return undefined;
  const t = val.toString().toLowerCase();
  if (t.includes('full')) return 'full_time';
  if (t.includes('part')) return 'part_time';
  if (t.includes('contract')) return 'contract';
  if (t.includes('intern')) return 'internship';
  if (t.includes('remote')) return 'remote';
  return t;
}

// Extract each posting into the result array
jobPostings.forEach(jp => {
  const job = {};

  // Title
  job.title = jp.title || jp.name || '';

  // Company
  if (jp.hiringOrganization) {
    job.companyName = jp.hiringOrganization.name || '';
  }

  // Description (strip possible HTML tags)
  if (jp.description) {
    const desc = typeof jp.description === 'string' ? jp.description : '';
    job.description = desc.replace(/<[^>]*>/g, '').trim();
  }

  // Location
  if (jp.jobLocation && jp.jobLocation.address) {
    const addr = jp.jobLocation.address;
    const parts = [
      addr.streetAddress,
      addr.addressLocality,
      addr.addressRegion,
      addr.postalCode,
      addr.addressCountry
    ].filter(Boolean);
    job.location = parts.join(', ');
  }

  // Job type
  if (jp.employmentType) {
    if (Array.isArray(jp.employmentType)) {
      job.jobType = normalizeJobType(jp.employmentType[0]);
    } else {
      job.jobType = normalizeJobType(jp.employmentType);
    }
  }

  // Source URL
  job.sourceUrl = jp.url || jp.sameAs || $('link[rel="canonical"]').attr('href') || '';

  // Posted date
  job.postedDateIsoString = jp.datePosted || jp.dateCreated || '';

  // Application deadline
  job.deadlineIsoString = jp.validThrough || '';

  // Salary handling
  if (jp.baseSalary) {
    const bs = jp.baseSalary;
    // MonetaryAmount
    if (bs['@type'] === 'MonetaryAmount' && bs.value) {
      job.salaryCurrency = bs.currency || bs['currency'] || '';
      if (typeof bs.value === 'object') {
        job.salaryMin = Number(bs.value.minValue) || undefined;
        job.salaryMax = Number(bs.value.maxValue) || undefined;
      } else {
        const val = Number(bs.value);
        if (!isNaN(val)) {
          job.salaryMin = val;
          job.salaryMax = val;
        }
      }
    }
    // MonetaryAmountDistribution
    else if (bs['@type'] === 'MonetaryAmountDistribution') {
      job.salaryCurrency = bs.currency || '';
      job.salaryMin = Number(bs.minValue) || undefined;
      job.salaryMax = Number(bs.maxValue) || undefined;
    }
  }

  // Only push if we have at least a title (real job)
  if (job.title) {
    result.push(job);
  }
});