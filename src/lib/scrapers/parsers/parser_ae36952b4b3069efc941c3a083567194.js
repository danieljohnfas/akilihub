if ($('.job-item, .job-listing, .listing-item').length) {
  $('.job-item, .job-listing, .listing-item').each(function () {
    const title = $(this).find('.title, h1, h2, h3, .job-title').first().text().trim();
    if (!title) return;
    const job = { title };
    const company = $(this).find('.company, .company-name').first().text().trim();
    if (company) job.companyName = company;
    const description = $(this).find('.description, .job-desc, .summary').first().text().trim();
    if (description) job.description = description;
    const location = $(this).find('.location, .job-location, .address').first().text().trim();
    if (location) job.location = location;
    const typeText = $(this).find('.type, .job-type, .employment-type').first().text().trim().toLowerCase();
    if (typeText) {
      if (/full.?time/.test(typeText)) job.jobType = 'full_time';
      else if (/part.?time/.test(typeText)) job.jobType = 'part_time';
      else if (/contract/.test(typeText)) job.jobType = 'contract';
      else if (/internship/.test(typeText)) job.jobType = 'internship';
      else if (/remote/.test(typeText)) job.jobType = 'remote';
    }
    const link = $(this).find('a').first().attr('href');
    if (link) job.sourceUrl = link;
    const postedRaw = $(this).find('.posted, .date-posted, time').first().attr('datetime') || $(this).find('.posted, .date-posted, time').first().text().trim();
    if (postedRaw) {
      const d = new Date(postedRaw);
      if (!isNaN(d)) job.postedDateIsoString = d.toISOString();
    }
    const deadlineRaw = $(this).find('.deadline, .date-deadline, time').first().attr('datetime') || $(this).find('.deadline, .date-deadline, time').first().text().trim();
    if (deadlineRaw) {
      const d = new Date(deadlineRaw);
      if (!isNaN(d)) job.deadlineIsoString = d.toISOString();
    }
    const salaryText = $(this).find('.salary, .compensation, .pay').first().text().trim();
    if (salaryText) {
      const m = salaryText.replace(/,/g, '').match(/([A-Z]{3})?\s*([0-9]+)(?:\s*-\s*([0-9]+))?/);
      if (m) {
        if (m[1]) job.salaryCurrency = m[1];
        job.salaryMin = Number(m[2]);
        if (m[3]) job.salaryMax = Number(m[3]);
      }
    }
    result.push(job);
  });
}