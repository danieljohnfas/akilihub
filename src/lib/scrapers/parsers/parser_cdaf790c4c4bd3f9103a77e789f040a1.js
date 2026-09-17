const jobElements = $('.job-listing, .job-item, .career-item, [data-job-id]');
if (jobElements.length > 0) {
  jobElements.each((i, el) => {
    const $el = $(el);
    const title = $el.find('h2, h3, .job-title, .title').first().text().trim();
    if (!title) return;
    const companyName = 'FHI 360';
    const description = $el.find('.job-description, .description, .excerpt').first().text().trim();
    const location = $el.find('.job-location, .location, .job-meta .location').first().text().trim();
    const jobTypeText = $el.find('.job-type, .type, .job-meta .type').first().text().trim().toLowerCase();
    const jobType = ['full_time', 'part_time', 'contract', 'internship', 'remote'].includes(jobTypeText) ? jobTypeText : '';
    const sourceUrl = $el.find('a[href*="/job/"], a[href*="/career/"], a.job-link').first().attr('href') || $el.find('a').first().attr('href') || '';
    const postedDate = $el.find('time, .job-date, .date').first().attr('datetime') || $el.find('time, .job-date, .date').first().text().trim();
    const deadlineDate = $el.find('.job-deadline, .deadline, .closing-date').first().attr('datetime') || $el.find('.job-deadline, .deadline, .closing-date').first().text().trim();
    const salaryText = $el.find('.job-salary, .salary, .compensation').first().text().trim();
    let salaryMin = null, salaryMax = null, salaryCurrency = '';
    if (salaryText) {
      const match = salaryText.match(/([\d,]+(?:\.\d+)?)\s*[-–]\s*([\d,]+(?:\.\d+)?)\s*([A-Z]{3})/);
      if (match) {
        salaryMin = parseFloat(match[1].replace(/,/g, ''));
        salaryMax = parseFloat(match[2].replace(/,/g, ''));
        salaryCurrency = match[3];
      }
    }
    result.push({
      title,
      companyName,
      description,
      location,
      jobType,
      sourceUrl: sourceUrl && !sourceUrl.startsWith('http') ? `https://www.fhi360.org${sourceUrl}` : sourceUrl,
      postedDateIsoString: postedDate,
      deadlineIsoString: deadlineDate,
      salaryMin,
      salaryMax,
      salaryCurrency
    });
  });
}