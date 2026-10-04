let jobContainers = null;
const selectors = [
  'article.job_listing',
  'li.job_listing',
  'div.job',
  'div.ajzjp-job-card',
  'div.job-card',
  'div.job-item'
];
for (const sel of selectors) {
  const elems = $(sel);
  if (elems.length) {
    jobContainers = elems;
    break;
  }
}
if (!jobContainers) {
  const fallback = $('a[href*="/job/"]').closest('article,li,div');
  if (fallback.length) jobContainers = fallback;
}
if (!jobContainers || !jobContainers.length) {
  // No job listings detected; result remains empty
} else {
  jobContainers.each(function () {
    const el = $(this);
    const titleEl = el.find('h1 a, h2 a, h3 a, a.job-title, a.title, a.entry-title').first();
    const title = titleEl.text().trim();
    if (!title) return;
    const sourceUrl = titleEl.attr('href') ? titleEl.attr('href').trim() : null;
    const companyName = el.find('.company, .company_name, .meta-company, .company-name').first().text().trim() || null;
    const location = el.find('.location, .job-location, .meta-location').first().text().trim() || null;
    const description = el.find('.description, .job-description, .entry-summary, .summary').first().text().trim() || null;
    let postedDateIsoString = null;
    const postedEl = el.find('time[datetime], .date, .posted-date').first();
    if (postedEl.length) {
      const raw = postedEl.attr('datetime') || postedEl.text().trim();
      const d = new Date(raw);
      if (!isNaN(d)) postedDateIsoString = d.toISOString();
    }
    let deadlineIsoString = null;
    const deadlineEl = el.find('.deadline, .closing-date, time[datetime].deadline').first();
    if (deadlineEl.length) {
      const raw = deadlineEl.attr('datetime') || deadlineEl.text().trim();
      const d = new Date(raw);
      if (!isNaN(d)) deadlineIsoString = d.toISOString();
    }
    let salaryMin = null,
      salaryMax = null,
      salaryCurrency = null;
    const salaryText = el.find('.salary, .pay, .salary-range').first().text().trim();
    if (salaryText) {
      const m = salaryText.match(/([A-Za-z$€£]+)?\s*([\d,]+)(?:\s*(?:-|to)\s*([\d,]+))?/);
      if (m) {
        salaryCurrency = m[1] ? m[1].replace(/[^A-Za-z$€£]/g, '') : null;
        if (m[2]) salaryMin = parseInt(m[2].replace(/,/g, ''), 10);
        if (m[3]) salaryMax = parseInt(m[3].replace(/,/g, ''), 10);
      }
    }
    let jobType = null;
    const typeText = el.find('.job_type, .type, .job-type').first().text().toLowerCase();
    if (typeText) {
      if (typeText.includes('full')) jobType = 'full_time';
      else if (typeText.includes('part')) jobType = 'part_time';
      else if (typeText.includes('contract')) jobType = 'contract';
      else if (typeText.includes('intern')) jobType = 'internship';
      else if (typeText.includes('remote')) jobType = 'remote';
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
}