const containers = $('article.job, .job-item, .listing, .vacancy, .position, li[data-job-id], div.job-card, .job, .job-listing');
containers.each((_, el) => {
  const elem = $(el);
  const title = elem.find('h1, h2, h3, .title, .job-title').first().text().trim();
  if (!title) return;
  const company = elem.find('.company, .company-name').first().text().trim();
  const description = elem.find('.description, .job-description, p').text().trim();
  const location = elem.find('.location, .job-location').first().text().trim();
  const typeText = elem.find('.type, .job-type').first().text().trim().toLowerCase();
  let jobType;
  if (/full\s?time/.test(typeText)) jobType = 'full_time';
  else if (/part\s?time/.test(typeText)) jobType = 'part_time';
  else if (/contract/.test(typeText)) jobType = 'contract';
  else if (/internship/.test(typeText)) jobType = 'internship';
  else if (/remote/.test(typeText)) jobType = 'remote';
  const sourceUrl = elem.find('a.apply, a[href]').first().attr('href') || undefined;
  const posted = elem.find('time[datetime]').first().attr('datetime') || elem.find('.posted-date').first().text().trim() || undefined;
  const deadline = elem.find('time.deadline[datetime]').first().attr('datetime') || undefined;
  const salaryText = elem.find('.salary, .compensation').first().text().trim();
  let salaryMin, salaryMax, salaryCurrency;
  if (salaryText) {
    const currencyMatch = salaryText.match(/[$€£¥]/);
    salaryCurrency = currencyMatch ? currencyMatch[0] : undefined;
    const nums = salaryText.replace(/[^\d\-.]/g, ' ').trim().split(/\s+/).map(n => parseFloat(n)).filter(n => !isNaN(n));
    if (nums.length === 1) {
      salaryMin = salaryMax = nums[0];
    } else if (nums.length >= 2) {
      salaryMin = nums[0];
      salaryMax = nums[1];
    }
  }
  result.push({
    title,
    companyName: company || undefined,
    description: description || undefined,
    location: location || undefined,
    jobType,
    sourceUrl,
    postedDateIsoString: posted,
    deadlineIsoString: deadline,
    salaryMin,
    salaryMax,
    salaryCurrency
  });
});