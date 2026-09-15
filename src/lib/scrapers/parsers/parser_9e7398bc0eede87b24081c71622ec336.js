const jobContainers = $('article, .tpg-item, .ultp-post, .job-item, .elementor-post');
jobContainers.each((_, elem) => {
  const container = $(elem);
  const titleEl = container.find('h1, h2, h3, .title, .entry-title').first();
  const title = titleEl.text().trim();
  if (!title) return;
  const sourceLink = titleEl.find('a').attr('href') || container.find('a').first().attr('href') || '';
  const description = container.find('.entry-content, .description, .post-content, p').first().text().trim();
  const location = container.find('.location, .job-location, .address').first().text().trim();
  const typeText = container.text().toLowerCase();
  let jobType = '';
  if (/full\s?time/.test(typeText)) jobType = 'full_time';
  else if (/part\s?time/.test(typeText)) jobType = 'part_time';
  else if (/contract/.test(typeText)) jobType = 'contract';
  else if (/internship/.test(typeText)) jobType = 'internship';
  else if (/remote/.test(typeText)) jobType = 'remote';
  const posted = container.find('time[datetime]').first().attr('datetime') || '';
  const deadline = container.find('.deadline time[datetime]').first().attr('datetime') || '';
  const salaryText = container.text();
  const salaryMatch = salaryText.match(/([\$£€])\s?([\d,]+)(?:\s?-\s?([\$£€])?\s?([\d,]+))?/);
  let salaryMin = null, salaryMax = null, salaryCurrency = null;
  if (salaryMatch) {
    salaryCurrency = salaryMatch[1];
    salaryMin = Number(salaryMatch[2].replace(/,/g, ''));
    if (salaryMatch[3]) {
      salaryMax = Number((salaryMatch[4] || salaryMatch[3]).replace(/,/g, ''));
      if (!salaryMatch[4]) salaryCurrency = salaryCurrency || salaryMatch[3];
    }
  }
  const hasApply = /apply|application|submit/i.test(container.text());
  if (!hasApply) return;
  result.push({
    title,
    companyName: '',
    description,
    location,
    jobType,
    sourceUrl: sourceLink,
    postedDateIsoString: posted,
    deadlineIsoString: deadline,
    salaryMin: salaryMin !== null ? salaryMin : undefined,
    salaryMax: salaryMax !== null ? salaryMax : undefined,
    salaryCurrency: salaryCurrency || undefined
  });
});