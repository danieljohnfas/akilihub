const jobCards = $('div.job-listing, article.job, li.job, .job-item, .job-card, .posting');
if (jobCards.length) {
  jobCards.each((i, el) => {
    const $el = $(el);
    const title = $el.find('h2, h3, .title, .job-title').first().text().trim();
    if (!title) return;
    const companyName = $el.find('.company, .employer, .company-name').first().text().trim() || '';
    const location = $el.find('.location, .job-location').first().text().trim() || '';
    const description = $el.find('.description, .summary, .job-description').first().text().trim() || '';
    const sourceUrl = $el.find('a').first().attr('href') || '';
    let jobType = '';
    const typeText = $el.find('.job-type, .type, .employment-type').first().text().trim().toLowerCase();
    if (typeText) {
      if (typeText.includes('full')) jobType = 'full_time';
      else if (typeText.includes('part')) jobType = 'part_time';
      else if (typeText.includes('contract')) jobType = 'contract';
      else if (typeText.includes('intern')) jobType = 'internship';
      else if (typeText.includes('remote')) jobType = 'remote';
    }
    const postedDateText = $el.find('.date, .posted-date, time').first().attr('datetime') || $el.find('.date, .posted-date, time').first().text().trim();
    const postedDateIsoString = postedDateText ? new Date(postedDateText).toISOString() : '';
    const deadlineText = $el.find('.deadline, .apply-by').first().attr('datetime') || $el.find('.deadline, .apply-by').first().text().trim();
    const deadlineIsoString = deadlineText ? new Date(deadlineText).toISOString() : '';
    const salaryText = $el.find('.salary, .compensation').first().text().trim();
    let salaryMin = null, salaryMax = null, salaryCurrency = '';
    if (salaryText) {
      const match = salaryText.match(/([\d\s,]+)\s*[-–]\s*([\d\s,]+)\s*(\S+)/);
      if (match) {
        salaryMin = parseFloat(match[1].replace(/[\s,]/g, ''));
        salaryMax = parseFloat(match[2].replace(/[\s,]/g, ''));
        salaryCurrency = match[3];
      } else {
        const match2 = salaryText.match(/([\d\s,]+)\s*(\S+)/);
        if (match2) {
          salaryMin = parseFloat(match2[1].replace(/[\s,]/g, ''));
          salaryCurrency = match2[2];
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
}