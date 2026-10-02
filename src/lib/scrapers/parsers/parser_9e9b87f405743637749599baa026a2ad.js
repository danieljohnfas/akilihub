// Find JSON‑LD JobPosting data
$('script[type="application/ld+json"]').each((_, elem) => {
  let data;
  try {
    data = JSON.parse($(elem).contents().text());
  } catch (e) {
    return;
  }
  const items = Array.isArray(data) ? data : (data['@graph'] ? data['@graph'] : [data]);
  items.forEach(item => {
    const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
    if (types.includes('JobPosting')) {
      const job = {};
      if (item.title) job.title = String(item.title).trim();
      if (item.hiringOrganization && item.hiringOrganization.name) job.companyName = String(item.hiringOrganization.name).trim();
      if (item.description) job.description = String(item.description).trim();
      if (item.jobLocation && item.jobLocation.address && item.jobLocation.address.addressLocality) {
        job.location = String(item.jobLocation.address.addressLocality).trim();
      }
      if (item.employmentType) {
        const typeMap = {
          'FULL_TIME': 'full_time',
          'PART_TIME': 'part_time',
          'CONTRACT': 'contract',
          'INTERNSHIP': 'internship',
          'TEMPORARY': 'contract',
          'VOLUNTEER': 'internship',
          'REMOTE': 'remote'
        };
        const normalized = String(item.employmentType).toUpperCase();
        job.jobType = typeMap[normalized] || normalized.toLowerCase();
      }
      if (item.url) job.sourceUrl = String(item.url).trim();
      if (item.datePosted) job.postedDateIsoString = new Date(item.datePosted).toISOString();
      if (item.validThrough) job.deadlineIsoString = new Date(item.validThrough).toISOString();
      if (item.baseSalary) {
        const salary = item.baseSalary;
        if (salary.value) {
          if (salary.value.minValue) job.salaryMin = Number(salary.value.minValue);
          if (salary.value.maxValue) job.salaryMax = Number(salary.value.maxValue);
          if (salary.value.currency) job.salaryCurrency = String(salary.value.currency).trim();
        } else if (salary.minValue) {
          job.salaryMin = Number(salary.minValue);
          job.salaryMax = Number(salary.maxValue);
          if (salary.currency) job.salaryCurrency = String(salary.currency).trim();
        }
      }
      result.push(job);
    }
  });
});

// Fallback: look for visible job containers only if a JobPosting was not found
if (result.length === 0) {
  // Common selectors used by many job boards
  const selectors = [
    '.job-listing',
    '.job-item',
    '.vacancy',
    '.position',
    'article.job',
    'li.job',
    '.post-entry'
  ];
  $(selectors.join(',')).each((_, container) => {
    const $c = $(container);
    // Heuristic: must have a title element with a link or heading
    const $title = $c.find('h1, h2, h3, h4, a').first();
    if (!$title.length) return;
    const titleText = $title.text().trim();
    if (!titleText) return;
    // Avoid generic blog posts: require presence of keywords like "apply", "deadline", "salary"
    const textBlock = $c.text().toLowerCase();
    if (!/(apply|deadline|salary|position|vacancy)/.test(textBlock)) return;
    const job = { title: titleText };
    const company = $c.find('.company, .employer').first().text().trim();
    if (company) job.companyName = company;
    const location = $c.find('.location').first().text().trim();
    if (location) job.location = location;
    const description = $c.find('.description, p').first().text().trim();
    if (description) job.description = description;
    // Simple job type detection
    if (/full[-\s]?time/.test(textBlock)) job.jobType = 'full_time';
    else if (/part[-\s]?time/.test(textBlock)) job.jobType = 'part_time';
    else if (/contract/.test(textBlock)) job.jobType = 'contract';
    else if (/internship/.test(textBlock)) job.jobType = 'internship';
    else if (/remote/.test(textBlock)) job.jobType = 'remote';
    // Source URL fallback to canonical link
    const canonical = $('link[rel="canonical"]').attr('href');
    if (canonical) job.sourceUrl = canonical;
    result.push(job);
  });
}