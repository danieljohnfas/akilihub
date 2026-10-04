const jobContainers = $('.job, .job-item, .vacancy, .vacancy-item, .career-item, .career-listing, article.job, li.job, .jobs li');

if (jobContainers.length) {
  jobContainers.each((_, elem) => {
    const container = $(elem);

    const titleEl = container.find('h1, h2, h3, .title, .job-title').first();
    const title = titleEl.text().trim();
    if (!title) return;

    const companyName = container.find('.company, .company-name, .employer').first().text().trim() || null;

    const description = container.find('.description, .job-description, .summary, p').first().text().trim() || null;

    const location = container.find('.location, .job-location').first().text().trim() || null;

    let jobType = null;
    const typeText = container.find('.type, .job-type').first().text().toLowerCase();
    if (typeText.includes('full')) jobType = 'full_time';
    else if (typeText.includes('part')) jobType = 'part_time';
    else if (typeText.includes('contract')) jobType = 'contract';
    else if (typeText.includes('intern')) jobType = 'internship';
    else if (typeText.includes('remote')) jobType = 'remote';

    let sourceUrl = null;
    const linkEl = container.find('a').first();
    if (linkEl.attr('href')) sourceUrl = linkEl.attr('href');

    const postedDateIsoString = container.find('time[datetime]').first().attr('datetime') || null;
    const deadlineIsoString = container.find('.deadline time[datetime]').first().attr('datetime') || null;

    let salaryMin = null, salaryMax = null, salaryCurrency = null;
    const salaryText = container.find('.salary, .compensation').first().text();
    if (salaryText) {
      const match = salaryText.replace(/,/g, '').match(/([A-Z]{3})?\s*([\d\.]+)(?:\s*-\s*([A-Z]{3})?\s*([\d\.]+))?/i);
      if (match) {
        salaryCurrency = match[1] || match[3] || null;
        salaryMin = parseFloat(match[2]) || null;
        salaryMax = match[4] ? parseFloat(match[4]) : salaryMin;
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
}