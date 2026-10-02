const selectors = ['.job', '.job-listing', '.listing-item', 'article', '.post', '.entry'];
$(selectors.join(',')).each((_, el) => {
  const $el = $(el);
  const title = $el.find('h1, h2, h3, .title, .job-title').first().text().trim();
  if (!title) return;
  const companyName = $el.find('.company, .company-name').first().text().trim() || null;
  const description = $el.find('.description, .job-description, .entry-content').first().text().trim() || null;
  const location = $el.find('.location, .job-location').first().text().trim() || null;
  const typeRaw = $el.find('.type, .job-type').first().text().trim().toLowerCase();
  const typeMap = { 'full time': 'full_time', 'full-time': 'full_time', 'part time': 'part_time', 'part-time': 'part_time', contract: 'contract', internship: 'internship', remote: 'remote' };
  const jobType = typeMap[typeRaw] || null;
  const sourceUrl = $el.find('a[href]').first().attr('href') || null;
  const postedDateIsoString = $el.find('time[datetime]').first().attr('datetime') || null;
  const deadlineIsoString = $el.find('.deadline time[datetime]').first().attr('datetime') || null;
  const salaryText = $el.find('.salary, .pay, .compensation').first().text().trim();
  let salaryMin = null, salaryMax = null, salaryCurrency = null;
  if (salaryText) {
    const match = salaryText.match(/([A-Z]{3})?\s*([\d,]+)(?:\s*[-–]\s*([\d,]+))?/);
    if (match) {
      salaryCurrency = match[1] || null;
      salaryMin = parseFloat(match[2].replace(/,/g, '')) || null;
      if (match[3]) salaryMax = parseFloat(match[3].replace(/,/g, '')) || null;
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