const selectors = [
  '.job-listing',
  '.job-item',
  '.vacancy',
  '.posting',
  '[data-job]',
  '.listing-item',
  '.career-item',
  '.position'
];
const jobElements = $(selectors.join(','));

jobElements.each(function () {
  const el = $(this);
  const title = el.find('.title, .job-title, h1, h2, h3').first().text().trim();
  if (!title) return;

  const job = { title };

  const company = el.find('.company, .company-name, .employer').first().text().trim();
  if (company) job.companyName = company;

  const description = el.find('.description, .job-description, .desc, .summary').first().text().trim();
  if (description) job.description = description;

  const location = el.find('.location, .job-location, .place').first().text().trim();
  if (location) job.location = location;

  const typeRaw = el.find('.type, .job-type, .employment-type').first().text().trim().toLowerCase();
  if (typeRaw) {
    const map = {
      fulltime: 'full_time',
      'full-time': 'full_time',
      parttime: 'part_time',
      'part-time': 'part_time',
      contract: 'contract',
      internship: 'internship',
      remote: 'remote'
    };
    job.jobType = map[typeRaw] || typeRaw;
  }

  const link = el.find('a[href]').first().attr('href');
  if (link) job.sourceUrl = link;

  const postedRaw = el.find('.posted, .date-posted, time[datetime]').first();
  const postedVal = postedRaw.attr('datetime') || postedRaw.text().trim();
  if (postedVal) {
    const iso = new Date(postedVal).toISOString();
    if (!isNaN(Date.parse(iso))) job.postedDateIsoString = iso;
  }

  const deadlineRaw = el.find('.deadline, .date-deadline, time[datetime]').first();
  const deadlineVal = deadlineRaw.attr('datetime') || deadlineRaw.text().trim();
  if (deadlineVal) {
    const iso = new Date(deadlineVal).toISOString();
    if (!isNaN(Date.parse(iso))) job.deadlineIsoString = iso;
  }

  const salaryText = el.find('.salary, .pay, .compensation').first().text().trim();
  if (salaryText) {
    const match = salaryText.replace(/,/g, '').match(/([A-Za-z$€£]+)?\s*(\d+(?:\.\d+)?)\s*(?:-|\s*to\s*)\s*(\d+(?:\.\d+)?)/);
    if (match) {
      job.salaryCurrency = (match[1] || '').trim();
      job.salaryMin = parseFloat(match[2]);
      job.salaryMax = parseFloat(match[3]);
    }
  }

  result.push(job);
});