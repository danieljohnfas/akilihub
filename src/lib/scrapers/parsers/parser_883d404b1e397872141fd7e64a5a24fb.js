const baseUrl = $('link[rel="canonical"]').attr('href') || null;

$('article, .job-card, .job-item, .listing-item, .single-job, .job-detail, .post, .job').each((_, el) => {
  const container = $(el);

  const title = container.find('h1, h2, h3').first().text().trim();
  if (!title) return;

  const companyName = container.find('.company, .company-name, .employer, .text-company').first().text().trim() || null;

  const description = container.find('.description, .job-description, .content, .mt-4').first().text().trim() || null;

  const location = container.find('.location, .job-location, .text-location, .address').first().text().trim() || null;

  const typeText = container.find('.job-type, .type, .employment-type').first().text().toLowerCase();
  let jobType = null;
  if (/full\s?-?\s?time/.test(typeText)) jobType = 'full_time';
  else if (/part\s?-?\s?time/.test(typeText)) jobType = 'part_time';
  else if (/contract/.test(typeText)) jobType = 'contract';
  else if (/internship/.test(typeText)) jobType = 'internship';
  else if (/remote/.test(typeText)) jobType = 'remote';

  const postedRaw = container.find('time[datetime]').first().attr('datetime') ||
                    container.find('.posted-date, .date-posted').first().text().trim();
  const postedDateIsoString = postedRaw ? new Date(postedRaw).toISOString() : null;

  const deadlineRaw = container.find('time[datetime][class*="deadline"]').first().attr('datetime') ||
                      container.find('.deadline, .deadline-date').first().text().trim();
  const deadlineIsoString = deadlineRaw ? new Date(deadlineRaw).toISOString() : null;

  let salaryMin = null, salaryMax = null, salaryCurrency = null;
  const salaryText = container.find('.salary, .pay, .compensation').first().text();
  if (salaryText) {
    const cleaned = salaryText.replace(/,/g, '');
    const match = cleaned.match(/([£$€])\s?(\d+(?:\.\d+)?)(?:\s?-\s?([£$€])?\s?(\d+(?:\.\d+)?))?/);
    if (match) {
      salaryCurrency = match[1] || match[3] || null;
      salaryMin = parseFloat(match[2]) || null;
      salaryMax = match[4] ? parseFloat(match[4]) : salaryMin;
    }
  }

  const sourceUrl = container.find('a.apply, a.apply-button, a[href*="apply"]').first().attr('href') ||
                    baseUrl ||
                    null;

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