// Identify potential job containers (common patterns)
const jobContainers = [];

// Look for structured JobPosting data (JSON‑LD)
$('script[type="application/ld+json"]').each((_, el) => {
  try {
    const data = JSON.parse($(el).html());
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item['@type'] === 'JobPosting') jobContainers.push(item);
      });
    } else if (data && data['@type'] === 'JobPosting') {
      jobContainers.push(data);
    }
  } catch (e) {}
});

// Fallback: look for repeated sections that look like job listings
$('h2, h3').each((_, el) => {
  const heading = $(el).text().trim();
  // Heuristic: heading contains typical job keywords
  const keywords = ['kazi', 'position', 'vacancy', 'opening', 'job', 'nafasi'];
  const lower = heading.toLowerCase();
  if (keywords.some(k => lower.includes(k))) {
    // Assume the whole parent section is a job container
    const container = $(el).closest('section, article, div');
    if (container.length) jobContainers.push(container);
  }
});

// Process each detected container
jobContainers.forEach(container => {
  // If container is a plain object from JSON‑LD, map directly
  if (typeof container === 'object' && container['@type'] === 'JobPosting') {
    const job = {
      title: container.title?.trim() || '',
      companyName: container.hiringOrganization?.name?.trim() || '',
      description: container.description?.trim() || '',
      location: (container.jobLocation?.address?.addressLocality || '')?.trim(),
      jobType: (() => {
        const type = (container.employmentType || '').toLowerCase();
        if (type.includes('full')) return 'full_time';
        if (type.includes('part')) return 'part_time';
        if (type.includes('contract')) return 'contract';
        if (type.includes('intern')) return 'internship';
        if (type.includes('remote')) return 'remote';
        return '';
      })(),
      sourceUrl: container.url?.trim() || '',
      postedDateIsoString: container.datePosted?.trim() || '',
      deadlineIsoString: container.validThrough?.trim() || '',
      salaryMin: (() => {
        const val = container.baseSalary?.value?.minValue;
        return typeof val === 'number' ? val : undefined;
      })(),
      salaryMax: (() => {
        const val = container.baseSalary?.value?.maxValue;
        return typeof val === 'number' ? val : undefined;
      })(),
      salaryCurrency: container.baseSalary?.value?.currency || ''
    };
    // Only keep entries with a clear title
    if (job.title) result.push(job);
  } else {
    // DOM‑based extraction
    const titleEl = $(container).find('h1, h2, h3').first();
    const title = titleEl.text().trim();
    if (!title) return; // not a job

    const job = {
      title,
      companyName: '',
      description: '',
      location: '',
      jobType: '',
      sourceUrl: '',
      postedDateIsoString: '',
      deadlineIsoString: '',
      salaryMin: undefined,
      salaryMax: undefined,
      salaryCurrency: ''
    };

    // Description: gather paragraphs until next heading of same level
    const descParts = [];
    let sibling = titleEl.next();
    while (sibling.length && !sibling.is('h1, h2, h3')) {
      if (sibling.is('p')) descParts.push(sibling.text().trim());
      sibling = sibling.next();
    }
    job.description = descParts.join('\n');

    // Try to pull structured details from lists or tables inside the container
    const text = $(container).text().toLowerCase();

    // Location heuristic
    const locMatch = text.match(/location[:\s]\s*([a-zA-Z\s,]+)/);
    if (locMatch) job.location = locMatch[1].trim();

    // Job type heuristic
    const typeMap = {
      full_time: /full[-\s]?time/,
      part_time: /part[-\s]?time/,
      contract: /contract/,
      internship: /internship|intern/,
      remote: /remote/
    };
    for (const [type, rgx] of Object.entries(typeMap)) {
      if (rgx.test(text)) { job.jobType = type; break; }
    }

    // Salary heuristic
    const salaryMatch = text.match(/salary[:\s]\s*([\d,]+)\s*-\s*([\d,]+)\s*([a-z]{3})/i);
    if (salaryMatch) {
      job.salaryMin = parseInt(salaryMatch[1].replace(/,/g, ''), 10);
      job.salaryMax = parseInt(salaryMatch[2].replace(/,/g, ''), 10);
      job.salaryCurrency = salaryMatch[3].toUpperCase();
    }

    // Source URL fallback to canonical link if present
    const canonical = $('link[rel="canonical"]').attr('href');
    if (canonical) job.sourceUrl = canonical;

    // Posted date from meta if available
    const posted = $('meta[property="article:published_time"]').attr('content');
    if (posted) job.postedDateIsoString = posted;

    // Only push if we have a title
    if (job.title) result.push(job);
  }
});