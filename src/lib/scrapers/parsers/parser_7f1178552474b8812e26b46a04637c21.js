const possibleJobSelectors = [
  '[data-job-id]',
  '.job-card',
  '.job-listing',
  '.job-item',
  'article.job',
  'li.job',
  'div.job',
  'section.job',
  'article[data-testid="job"]'
];
let found = false;
for (const sel of possibleJobSelectors) {
  const items = $(sel);
  if (items.length) {
    items.each((i, el) => {
      const container = $(el);
      const titleEl = container.find('h1, h2, h3, .job-title, a[title], a[href*="/jobs/"], a[href*="/job/"]').first();
      const title = titleEl.text().trim();
      if (!title) return;
      const job = { title };
      const company = container.find('.company, .company-name, .employer').first().text().trim();
      if (company) job.companyName = company;
      const desc = container.find('.description, .job-description, p').first().text().trim();
      if (desc) job.description = desc;
      const location = container.find('.location, .job-location').first().text().trim();
      if (location) job.location = location;
      const typeText = container.find('.type, .job-type').first().text().toLowerCase();
      if (typeText) {
        if (typeText.includes('full')) job.jobType = 'full_time';
        else if (typeText.includes('part')) job.jobType = 'part_time';
        else if (typeText.includes('contract')) job.jobType = 'contract';
        else if (typeText.includes('intern')) job.jobType = 'internship';
        else if (typeText.includes('remote')) job.jobType = 'remote';
      }
      const link = titleEl.is('a') ? titleEl.attr('href') : container.find('a').first().attr('href');
      if (link) job.sourceUrl = link;
      const posted = container.find('time[datetime]').first().attr('datetime');
      if (posted) job.postedDateIsoString = posted;
      const deadline = container.find('.deadline time[datetime]').first().attr('datetime');
      if (deadline) job.deadlineIsoString = deadline;
      const salaryText = container.find('.salary, .pay').first().text();
      if (salaryText) {
        const match = salaryText.replace(/,/g, '').match(/([A-Za-z]{3,})\s?(\d+(?:\.\d+)?)\s?[-–]\s?([A-Za-z]{3,})?\s?(\d+(?:\.\d+)?)/);
        if (match) {
          job.salaryCurrency = match[1];
          job.salaryMin = parseFloat(match[2]);
          if (match[3]) job.salaryCurrency = match[3];
          job.salaryMax = parseFloat(match[4]);
        }
      }
      result.push(job);
    });
    found = true;
    break;
  }
}
if (!found) {
  // No job listings detected; result remains empty.
}