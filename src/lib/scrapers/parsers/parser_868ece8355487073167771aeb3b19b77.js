const jobSelectors = [
  '.job-listing',
  '.job-item',
  '.career-item',
  'article.job',
  'li.job',
  '[data-job-id]'
];

const seenTitles = new Set();

jobSelectors.forEach(selector => {
  $(selector).each(function () {
    const $job = $(this);

    // Attempt to extract a clear job title
    const title = $job.find('h1, h2, h3, .title, .job-title, a').first().text().trim();
    if (!title) return;
    if (seenTitles.has(title)) return;
    seenTitles.add(title);

    const companyName = $job.find('.company, .company-name').first().text().trim() || null;
    const location = $job.find('.location, .job-location').first().text().trim() || null;
    const description = $job.find('.description, .job-description, p').first().text().trim() || null;

    const typeText = $job.find('.type, .job-type').first().text().trim().toLowerCase();
    let jobType = null;
    if (typeText.includes('full')) jobType = 'full_time';
    else if (typeText.includes('part')) jobType = 'part_time';
    else if (typeText.includes('contract')) jobType = 'contract';
    else if (typeText.includes('intern')) jobType = 'internship';
    else if (typeText.includes('remote')) jobType = 'remote';

    const sourceUrl = $job.find('a[href]').first().attr('href') || null;
    const postedDateIsoString = $job.find('time[datetime]').first().attr('datetime') || null;
    const deadlineIsoString = $job.find('.deadline time[datetime]').first().attr('datetime') || null;

    // Salary extraction (basic)
    const salaryText = $job.text();
    let salaryMin = null,
        salaryMax = null,
        salaryCurrency = null;
    const salaryMatch = salaryText.match(/([A-Z]{3})?\s?\$?([\d,]+)(?:\s?-\s?\$?([\d,]+))?/);
    if (salaryMatch) {
      salaryCurrency = salaryMatch[1] || '$';
      salaryMin = Number(salaryMatch[2].replace(/,/g, ''));
      if (salaryMatch[3]) salaryMax = Number(salaryMatch[3].replace(/,/g, ''));
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
      salaryCurrency
    });
  });
});