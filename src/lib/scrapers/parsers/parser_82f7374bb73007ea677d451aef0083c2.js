// Extract JobPosting data from JSON‑LD scripts
$('script[type="application/ld+json"]').each((i, el) => {
  try {
    const data = JSON.parse($(el).contents().text());
    const traverse = obj => {
      if (Array.isArray(obj)) {
        obj.forEach(traverse);
        return;
      }
      if (obj && typeof obj === 'object') {
        if (obj['@type'] === 'JobPosting') {
          const job = {
            title: obj.title || '',
            companyName:
              (obj.hiringOrganization && obj.hiringOrganization.name) || '',
            description: obj.description || '',
            location:
              (obj.jobLocation &&
                obj.jobLocation[0] &&
                obj.jobLocation[0].address &&
                obj.jobLocation[0].address.addressLocality) ||
              '',
            jobType:
              (obj.employmentType &&
                obj.employmentType
                  .toString()
                  .toLowerCase()
                  .replace(/\s+/g, '_')) ||
              '',
            sourceUrl: obj.url || '',
            postedDateIsoString: obj.datePosted || '',
            deadlineIsoString: obj.validThrough || '',
            salaryMin:
              obj.baseSalary &&
              obj.baseSalary.value &&
              obj.baseSalary.value.minValue
                ? Number(obj.baseSalary.value.minValue)
                : undefined,
            salaryMax:
              obj.baseSalary &&
              obj.baseSalary.value &&
              obj.baseSalary.value.maxValue
                ? Number(obj.baseSalary.value.maxValue)
                : undefined,
            salaryCurrency: (obj.baseSalary && obj.baseSalary.currency) || ''
          };
          result.push(job);
        }
        // recurse into nested objects
        Object.values(obj).forEach(traverse);
      }
    };
    traverse(data);
  } catch (e) {
    // ignore malformed JSON‑LD
  }
});

// Fallback: look for typical DOM job card structures
$('.job-card, .job-item, .listing-item, .post-item, article.job, li.job').each(
  (i, el) => {
    const $el = $(el);
    const title = $el
      .find('h1, h2, h3, .job-title, .title')
      .first()
      .text()
      .trim();
    if (!title) return;

    const company = $el.find('.company, .company-name').first().text().trim();
    const location = $el
      .find('.location, .job-location')
      .first()
      .text()
      .trim();
    const description = $el
      .find('.description, .job-description')
      .first()
      .text()
      .trim();

    const typeRaw = $el
      .find('.type, .employment-type')
      .first()
      .text()
      .trim()
      .toLowerCase();
    const typeMap = {
      'full time': 'full_time',
      'full-time': 'full_time',
      'part time': 'part_time',
      'part-time': 'part_time',
      contract: 'contract',
      internship: 'internship',
      remote: 'remote'
    };
    const jobType = typeMap[typeRaw] || '';

    const posted = $el.find('time[datetime]').first().attr('datetime') || '';
    const url = $el.find('a').first().attr('href') || '';

    result.push({
      title,
      companyName: company,
      description,
      location,
      jobType,
      sourceUrl: url,
      postedDateIsoString: posted
    });
  }
);