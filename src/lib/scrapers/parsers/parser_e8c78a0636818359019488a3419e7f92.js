const jobContainers = $('.job-card, .job-listing, .job-item, .vacancy, .career-item, article[data-job-id], li.job, div.job');

jobContainers.each(function () {
  const el = $(this);
  const title = el.find('h1, h2, .job-title, .title, a.job-link').first().text().trim();
  if (!title) return;
  const companyName = el.find('.company, .company-name, .employer').first().text().trim();
  const description = el.find('.description, .job-description, p').first().text().trim();
  const location = el.find('.location, .job-location').first().text().trim();

  const typeRaw = el.find('.type, .job-type, .employment-type').first().text().trim().toLowerCase();
  let jobType;
  if (/full.?time/.test(typeRaw)) jobType = 'full_time';
  else if (/part.?time/.test(typeRaw)) jobType = 'part_time';
  else if (/contract/.test(typeRaw)) jobType = 'contract';
  else if (/intern/.test(typeRaw)) jobType = 'internship';
  else if (/remote/.test(typeRaw)) jobType = 'remote';

  const sourceUrl = el.find('a[href]').first().attr('href') || '';

  const postedElem = el.find('time[datetime], .posted-date, .date-posted').first();
  let postedDateIsoString = '';
  if (postedElem.length) {
    const raw = postedElem.attr('datetime') || postedElem.text();
    const d = new Date(raw);
    if (!isNaN(d)) postedDateIsoString = d.toISOString();
  }

  const deadlineElem = el.find('.deadline, time.deadline, .apply-by').first();
  let deadlineIsoString = '';
  if (deadlineElem.length) {
    const raw = deadlineElem.attr('datetime') || deadlineElem.text();
    const d = new Date(raw);
    if (!isNaN(d)) deadlineIsoString = d.toISOString();
  }

  const salaryText = el.find('.salary, .compensation').first().text().trim();
  let salaryMin = null,
    salaryMax = null,
    salaryCurrency = null;
  if (salaryText) {
    const currencyMatch = salaryText.match(/[\£\$\€\¥]|[A-Z]{3}/);
    if (currencyMatch) salaryCurrency = currencyMatch[0];
    const numbers = salaryText.match(/[\d,]+/g);
    if (numbers) {
      const nums = numbers.map((n) => parseInt(n.replace(/,/g, ''), 10));
      if (nums.length === 1) {
        salaryMin = salaryMax = nums[0];
      } else if (nums.length >= 2) {
        salaryMin = nums[0];
        salaryMax = nums[1];
      }
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