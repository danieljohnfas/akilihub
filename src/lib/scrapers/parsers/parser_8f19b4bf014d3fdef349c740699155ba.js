const jobSelectors = ['.job-listing', '.job-item', '.vacancy', '.career', '.posting'];
jobSelectors.forEach(sel => {
  $(sel).each((_, el) => {
    const $el = $(el);
    const title = $el.find('h1, h2, h3, .title, .job-title').first().text().trim();
    if (!title) return;
    const job = { title };
    const company = $el.find('.company, .company-name, .employer').first().text().trim();
    if (company) job.companyName = company;
    const description = $el.find('.description, .job-description, p').first().text().trim();
    if (description) job.description = description;
    const location = $el.find('.location, .job-location, .city').first().text().trim();
    if (location) job.location = location;
    const typeText = $el.find('.job-type, .type').first().text().toLowerCase();
    if (typeText) {
      if (typeText.includes('full')) job.jobType = 'full_time';
      else if (typeText.includes('part')) job.jobType = 'part_time';
      else if (typeText.includes('contract')) job.jobType = 'contract';
      else if (typeText.includes('intern')) job.jobType = 'internship';
      else if (typeText.includes('remote')) job.jobType = 'remote';
    }
    const sourceLink = $el.find('a[href]').first().attr('href');
    if (sourceLink) job.sourceUrl = sourceLink;
    const posted = $el.find('time[datetime]').first().attr('datetime');
    if (posted) job.postedDateIsoString = posted;
    const deadline = $el.find('.deadline, .apply-by time[datetime]').first().attr('datetime');
    if (deadline) job.deadlineIsoString = deadline;
    const salaryText = $el.find('.salary, .pay').first().text();
    if (salaryText) {
      const match = salaryText.replace(/,/g, '').match(/([A-Za-z]{3})\s?(\d+(?:\.\d+)?)\s?-\s?([A-Za-z]{3})?\s?(\d+(?:\.\d+)?)/);
      if (match) {
        job.salaryCurrency = match[1];
        job.salaryMin = parseFloat(match[2]);
        job.salaryMax = parseFloat(match[4] || match[3]);
        if (!job.salaryCurrency && match[3]) job.salaryCurrency = match[3];
      }
    }
    result.push(job);
  });
});