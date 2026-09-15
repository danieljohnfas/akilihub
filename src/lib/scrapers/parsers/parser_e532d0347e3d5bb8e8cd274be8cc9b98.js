// Attempt to extract JobPosting data from JSON‑LD first
$('script[type="application/ld+json"]').each((_, el) => {
  try {
    const data = JSON.parse($(el).contents().text());
    const items = Array.isArray(data) ? data : [data];
    items.forEach(item => {
      if (item && (item['@type'] === 'JobPosting' || (Array.isArray(item['@type']) && item['@type'].includes('JobPosting')))) {
        const job = {
          title: item.title || '',
          companyName: item.hiringOrganization && item.hiringOrganization.name ? item.hiringOrganization.name : '',
          description: item.description || '',
          location: (item.jobLocation && item.jobLocation.address && item.jobLocation.address.addressLocality) ? item.jobLocation.address.addressLocality : '',
          jobType: (item.employmentType && typeof item.employmentType === 'string')
            ? item.employmentType.toLowerCase().replace(/\s+/g, '_')
            : '',
          sourceUrl: item.url || '',
          postedDateIsoString: item.datePosted || '',
          deadlineIsoString: item.validThrough || '',
          salaryMin: null,
          salaryMax: null,
          salaryCurrency: null
        };
        if (item.baseSalary && typeof item.baseSalary === 'object') {
          const salary = item.baseSalary;
          if (salary.value) {
            if (salary.value.minValue) job.salaryMin = Number(salary.value.minValue);
            if (salary.value.maxValue) job.salaryMax = Number(salary.value.maxValue);
            if (salary.value.currency) job.salaryCurrency = salary.value.currency;
          }
        }
        result.push(job);
      }
    });
  } catch (e) {
    // ignore malformed JSON‑LD
  }
});

// Fallback: look for obvious job listing containers in the DOM
const containers = $('.job-listing, .job-item, .career-item, .listing-item, article.post, .entry-content li');

containers.each((_, elem) => {
  const $elem = $(elem);
  // Find a title that looks like a job title
  const titleEl = $elem.find('h1, h2, h3, .job-title, .title').first();
  const title = titleEl.text().trim();
  if (!title) return; // skip if no clear title

  // Heuristic to avoid treating the article title as a job (must have additional job‑specific clues)
  const hasDetails = $elem.find('.location, .salary, .employment-type, .job-type').length > 0 ||
                     $elem.text().toLowerCase().includes('apply') ||
                     $elem.text().toLowerCase().includes('responsibilities');

  if (!hasDetails) return;

  const job = {
    title,
    companyName: $elem.find('.company, .company-name').first().text().trim(),
    description: $elem.find('.description, .job-description, p').first().text().trim(),
    location: $elem.find('.location, .job-location').first().text().trim(),
    jobType: (function () {
      const txt = $elem.find('.employment-type, .job-type').first().text().toLowerCase();
      if (txt.includes('full')) return 'full_time';
      if (txt.includes('part')) return 'part_time';
      if (txt.includes('contract')) return 'contract';
      if (txt.includes('intern')) return 'internship';
      if (txt.includes('remote')) return 'remote';
      return '';
    })(),
    sourceUrl: window.location ? window.location.href : '',
    postedDateIsoString: '',
    deadlineIsoString: '',
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null
  };

  // Attempt to parse salary if present
  const salaryText = $elem.find('.salary, .pay, .compensation').first().text();
  const salaryMatch = salaryText.replace(/,/g, '').match(/([A-Z]{3})?\s*\$?(\d+(?:\.\d+)?)/i);
  if (salaryMatch) {
    job.salaryCurrency = salaryMatch[1] || 'USD';
    job.salaryMin = Number(salaryMatch[2]);
    job.salaryMax = job.salaryMin;
  }

  result.push(job);
});