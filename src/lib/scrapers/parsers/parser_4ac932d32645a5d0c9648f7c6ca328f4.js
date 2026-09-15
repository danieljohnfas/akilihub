const jobSelectors = [
  '.job-item',
  '.job-card',
  '.job-listing',
  '.listing-item',
  '.vacancy',
  '.position',
  '.career-item',
  'article[data-job-id]',
  'article.job',
  'li.job',
  'div[data-job-id]',
];

let found = false;

for (const selector of jobSelectors) {
  const containers = $(selector);
  if (containers.length) {
    containers.each((_, el) => {
      const container = $(el);

      const title = container.find('h1, h2, h3, .job-title, .title, a.title').first().text().trim() ||
                    container.attr('data-title') || '';

      if (!title) return; // skip if no clear title

      const companyName = container.find('.company, .company-name, .employer').first().text().trim() ||
                          container.attr('data-company') || '';

      const description = container.find('.description, .job-description, .summary, p').first().text().trim() || '';

      const location = container.find('.location, .job-location, .city, .place').first().text().trim() || '';

      const typeText = container.find('.type, .job-type, .employment-type').first().text().trim().toLowerCase();
      let jobType = '';
      if (typeText.includes('full')) jobType = 'full_time';
      else if (typeText.includes('part')) jobType = 'part_time';
      else if (typeText.includes('contract')) jobType = 'contract';
      else if (typeText.includes('intern')) jobType = 'internship';
      else if (typeText.includes('remote')) jobType = 'remote';

      const sourceUrl = container.find('a[href]').first().attr('href') || '';

      const postedRaw = container.find('time[datetime], .posted-date, .date-posted').first().attr('datetime') ||
                        container.find('.posted-date, .date-posted').first().text().trim();
      const postedDateIsoString = postedRaw ? new Date(postedRaw).toISOString() : '';

      const deadlineRaw = container.find('.deadline, .apply-by, time[datetime][class*="deadline"]').first().attr('datetime') ||
                          container.find('.deadline, .apply-by').first().text().trim();
      const deadlineIsoString = deadlineRaw ? new Date(deadlineRaw).toISOString() : '';

      let salaryMin = null;
      let salaryMax = null;
      let salaryCurrency = null;
      const salaryText = container.find('.salary, .pay, .compensation').first().text().trim();
      if (salaryText) {
        const salaryMatch = salaryText.replace(/,/g, '').match(/([A-Z]{3})?\s*([\d\.]+)\s*(?:-|\s+to\s+)?\s*([\d\.]+)?/i);
        if (salaryMatch) {
          salaryCurrency = salaryMatch[1] ? salaryMatch[1].toUpperCase() : null;
          salaryMin = salaryMatch[2] ? parseFloat(salaryMatch[2]) : null;
          salaryMax = salaryMatch[3] ? parseFloat(salaryMatch[3]) : null;
        }
      }

      result.push({
        title,
        companyName,
        description,
        location,
        jobType,
        sourceUrl,
        postedDateIsoString,
        deadlineIsoString,
        salaryMin,
        salaryMax,
        salaryCurrency,
      });
    });
    found = true;
    break;
  }
}

// If no job containers were found, result remains empty.