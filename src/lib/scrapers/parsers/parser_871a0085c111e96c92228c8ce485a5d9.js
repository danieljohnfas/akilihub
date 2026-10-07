const containers = $('article.post, .job-listing, .job-item, .listing-item, li.job');
containers.each((_, el) => {
  const $el = $(el);
  const titleEl = $el.find('h1, h2, h3').filter((_, e) => $(e).text().trim()).first();
  const title = titleEl.text().trim();
  if (!title) return;
  const link = titleEl.find('a').attr('href') || $el.find('a').first().attr('href') || '';
  const description = $el.find('.entry-summary, .job-description, .description, p').first().text().trim();
  const companyName = $el.find('.company, .company-name, .entry-company').first().text().trim();
  const location = $el.find('.location, .job-location').first().text().trim();
  const typeText = $el.find('.job-type, .type').first().text().toLowerCase();
  let jobType = '';
  if (/full.?time/.test(typeText)) jobType = 'full_time';
  else if (/part.?time/.test(typeText)) jobType = 'part_time';
  else if (/contract/.test(typeText)) jobType = 'contract';
  else if (/internship/.test(typeText)) jobType = 'internship';
  else if (/remote/.test(typeText)) jobType = 'remote';
  const posted = $el.find('time[datetime]').first().attr('datetime') || '';
  const deadline = $el.find('.deadline time[datetime]').first().attr('datetime') || '';
  const salaryText = $el.find('.salary, .pay, .compensation').first().text();
  const salaryMatch = salaryText.replace(/,/g, '').match(/([A-Za-z$€£]+)?\s*([\d]+(?:\.\d+)?)(?:\s*-\s*([A-Za-z$€£]+)?\s*([\d]+(?:\.\d+)?))?/);
  let salaryMin = null, salaryMax = null, salaryCurrency = null;
  if (salaryMatch) {
    salaryCurrency = salaryMatch[1] || salaryMatch[3] || '';
    salaryMin = parseFloat(salaryMatch[2]) || null;
    salaryMax = salaryMatch[4] ? parseFloat(salaryMatch[4]) : salaryMin;
  }
  result.push({
    title,
    companyName: companyName || undefined,
    description: description || undefined,
    location: location || undefined,
    jobType: jobType || undefined,
    sourceUrl: link || undefined,
    postedDateIsoString: posted || undefined,
    deadlineIsoString: deadline || undefined,
    salaryMin: salaryMin !== null ? salaryMin : undefined,
    salaryMax: salaryMax !== null ? salaryMax : undefined,
    salaryCurrency: salaryCurrency || undefined
  });
});