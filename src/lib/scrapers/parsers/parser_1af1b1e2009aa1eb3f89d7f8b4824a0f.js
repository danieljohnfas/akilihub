const jobSelectors = [
  '.job',
  '.job-listing',
  '.career-item',
  '.vacancy',
  '.opening',
  '.position',
  'article[data-job]',
  'li[data-job]',
  '[data-job-id]',
  '[itemtype*="JobPosting"]'
];
const jobs = $(jobSelectors.join(','));

jobs.each((_, el) => {
  const container = $(el);
  const title = container.find('h1, h2, h3, .title, .job-title').first().text().trim();
  if (!title) return;

  const job = {
    title,
    companyName: container.find('.company, .company-name, .employer').first().text().trim() || undefined,
    description: container.find('.description, .job-description, p').first().text().trim() || undefined,
    location: container.find('.location, .job-location').first().text().trim() || undefined,
    jobType: (function () {
      const text = container.find('.type, .job-type').first().text().toLowerCase();
      if (text.includes('full')) return 'full_time';
      if (text.includes('part')) return 'part_time';
      if (text.includes('contract')) return 'contract';
      if (text.includes('intern')) return 'internship';
      if (text.includes('remote')) return 'remote';
      return undefined;
    })(),
    sourceUrl: container.find('a[href]').first().attr('href') || undefined,
    postedDateIsoString: (function () {
      const dateStr = container.find('time[datetime]').first().attr('datetime') ||
                      container.find('.date-posted, .posted').first().text();
      const d = new Date(dateStr);
      return isNaN(d) ? undefined : d.toISOString();
    })(),
    deadlineIsoString: (function () {
      const dateStr = container.find('time[deadline], .deadline').first().attr('datetime') ||
                      container.find('.deadline').first().text();
      const d = new Date(dateStr);
      return isNaN(d) ? undefined : d.toISOString();
    })(),
    salaryMin: (function () {
      const txt = container.find('.salary, .compensation').first().text().replace(/[^0-9.-]+/g, '');
      const num = parseFloat(txt);
      return isNaN(num) ? undefined : num;
    })(),
    salaryMax: undefined,
    salaryCurrency: (function () {
      const txt = container.find('.salary, .compensation').first().text();
      const match = txt.match(/[\$€£¥]/);
      return match ? match[0] : undefined;
    })()
  };
  result.push(job);
});