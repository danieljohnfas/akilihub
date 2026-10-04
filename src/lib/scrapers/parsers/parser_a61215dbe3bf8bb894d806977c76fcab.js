const jobContainers = $('.job-item, .job-card, .vacancy-item, .listing, article, li.job');
jobContainers.each((i, el) => {
  const container = $(el);
  const title = container.find('h1, h2, h3, h4, a.job-link, a.title, a[href*="/jobs/"]').first().text().trim();
  if (!title) return;
  const sourceUrl = container.find('a[href*="/jobs/"]').first().attr('href') || undefined;
  const companyName = container.find('.company, .employer, .company-name').first().text().trim() || undefined;
  const description = container.find('.description, .job-description, p').first().text().trim() || undefined;
  const location = container.find('.location, .job-location').first().text().trim() || undefined;
  const typeText = container.find('.type, .job-type').first().text().trim().toLowerCase();
  let jobType;
  if (typeText.includes('full')) jobType = 'full_time';
  else if (typeText.includes('part')) jobType = 'part_time';
  else if (typeText.includes('contract')) jobType = 'contract';
  else if (typeText.includes('intern')) jobType = 'internship';
  else if (typeText.includes('remote')) jobType = 'remote';
  const postedDateIsoString = container.find('time[datetime]').first().attr('datetime') || undefined;
  const deadlineIsoString = container.find('time.deadline[datetime]').first().attr('datetime') || undefined;
  let salaryMin, salaryMax, salaryCurrency;
  const salaryText = container.find('.salary, .pay, .compensation').first().text().trim();
  if (salaryText) {
    const currencyMatch = salaryText.match(/[\$€£¥]|[A-Z]{3}/);
    salaryCurrency = currencyMatch ? currencyMatch[0] : undefined;
    const numbers = salaryText.match(/[\d,.]+/g);
    if (numbers && numbers.length) {
      const nums = numbers.map(n => parseFloat(n.replace(/,/g, '')));
      if (nums.length === 1) {
        salaryMin = nums[0];
        salaryMax = nums[0];
      } else if (nums.length >= 2) {
        salaryMin = Math.min(...nums);
        salaryMax = Math.max(...nums);
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
    salaryCurrency
  });
});