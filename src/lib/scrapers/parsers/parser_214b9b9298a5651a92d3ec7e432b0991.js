const jobSelectors = [
  '.job-listing',
  '.job-item',
  '.job-card',
  '.vacancy',
  '.listing-item',
  '.search-results .result',
  '.post-job',
  '[data-job]',
  '.career-item',
  '.position',
  '.opening',
];
let containers = $(jobSelectors.join(','));

if (containers.length) {
  const normalizeJobType = (text) => {
    if (!text) return '';
    const t = text.toLowerCase();
    if (t.includes('full')) return 'full_time';
    if (t.includes('part')) return 'part_time';
    if (t.includes('contract')) return 'contract';
    if (t.includes('intern')) return 'internship';
    if (t.includes('remote')) return 'remote';
    return '';
  };

  const extractSalary = (str) => {
    if (!str) return {};
    const clean = str.replace(/[,]/g, '');
    const match = clean.match(/([A-Z]{3})?\s?(\d+(?:\.\d+)?)(?:\s?-\s?([A-Z]{3})?\s?(\d+(?:\.\d+)?))?/i);
    if (!match) return {};
    const currency = match[1] || match[3] || '';
    const min = parseFloat(match[2]) || null;
    const max = match[4] ? parseFloat(match[4]) : null;
    return { salaryCurrency: currency, salaryMin: min, salaryMax: max };
  };

  containers.each((_, elem) => {
    const container = $(elem);

    const title = container.find('h1, h2, h3, .job-title, a.title, a[href*="/jobs/"]').first().text().trim();
    if (!title) return;

    const companyName = container.find('.company, .company-name, .employer').first().text().trim() || null;
    const location = container.find('.location, .job-location, .address').first().text().trim() || null;
    const description = container.find('.description, .job-description, .summary, p').first().text().trim() || null;
    const jobType = normalizeJobType(container.find('.job-type, .type, .employment-type').first().text().trim());

    let sourceUrl = container.find('a.apply, a[href*="/apply"], a[href*="/jobs/"]').first().attr('href') || null;
    if (sourceUrl && !sourceUrl.startsWith('http')) {
      const base = $('base').attr('href') || '';
      sourceUrl = new URL(sourceUrl, base || '').href;
    }

    const postedDateIsoString = container.find('time[datetime]').first().attr('datetime') || null;
    const deadlineIsoString = container.find('time.deadline, .deadline time').first().attr('datetime') || null;

    const salaryInfo = extractSalary(container.text());

    const job = {
      title,
      companyName,
      description,
      location,
      jobType,
      sourceUrl,
      postedDateIsoString,
      deadlineIsoString,
      salaryMin: salaryInfo.salaryMin ?? null,
      salaryMax: salaryInfo.salaryMax ?? null,
      salaryCurrency: salaryInfo.salaryCurrency || null,
    };
    result.push(job);
  });
}