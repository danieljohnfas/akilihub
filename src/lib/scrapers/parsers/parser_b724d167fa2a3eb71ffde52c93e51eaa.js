const selectors = [
  '.job-item',
  '.job',
  '.posting',
  '.listing',
  '.career-item',
  '[data-job-id]',
  '[data-job]',
  '[class*="job"]',
  '[class*="position"]',
  '[class*="listing"]'
];
const jobElements = $(selectors.join(','));

if (jobElements.length) {
  jobElements.each((_, el) => {
    const elem = $(el);
    const title = elem.find('h1, h2, h3, .title, .job-title, .position-title').first().text().trim() ||
                  elem.attr('title')?.trim() || null;
    if (!title) return;
    const companyName = elem.find('.company, .company-name, .employer').first().text().trim() || null;
    const description = elem.find('.description, .job-description, .summary').first().text().trim() || null;
    const location = elem.find('.location, .job-location').first().text().trim() || null;
    const typeText = elem.find('.type, .job-type').first().text().trim().toLowerCase() || '';
    let jobType = null;
    if (typeText.includes('full')) jobType = 'full_time';
    else if (typeText.includes('part')) jobType = 'part_time';
    else if (typeText.includes('contract')) jobType = 'contract';
    else if (typeText.includes('intern')) jobType = 'internship';
    else if (typeText.includes('remote')) jobType = 'remote';
    const sourceUrl = elem.find('a[href]').first().attr('href') ? new URL(elem.find('a[href]').first().attr('href'), window.location.href).href : null;
    const postedDate = elem.find('time[datetime]').first().attr('datetime') || null;
    const deadline = elem.find('.deadline time[datetime]').first().attr('datetime') || null;
    const salaryText = elem.find('.salary, .pay').first().text().trim();
    let salaryMin = null, salaryMax = null, salaryCurrency = null;
    if (salaryText) {
      const salaryMatch = salaryText.match(/([A-Za-z]{3})?\s*([\d,]+)(?:\s*-\s*([A-Za-z]{3})?\s*([\d,]+))?/);
      if (salaryMatch) {
        salaryCurrency = salaryMatch[1] || salaryMatch[3] || null;
        salaryMin = Number(salaryMatch[2].replace(/,/g, '')) || null;
        if (salaryMatch[4]) salaryMax = Number(salaryMatch[4].replace(/,/g, '')) || null;
      }
    }
    result.push({
      title,
      companyName,
      description,
      location,
      jobType,
      sourceUrl,
      postedDateIsoString: postedDate,
      deadlineIsoString: deadline,
      salaryMin,
      salaryMax,
      salaryCurrency
    });
  });
}