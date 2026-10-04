try {
  const jobContainers = $('.job, .vacancy, .job-listing, .job-item, article.post, .entry-content li');
  if (jobContainers.length) {
    jobContainers.each((i, el) => {
      const container = $(el);
      const title = container.find('h1, h2, h3, .title, .job-title, a').first().text().trim();
      if (!title) return;
      const job = { title };
      const company = container.find('.company, .company-name').first().text().trim();
      if (company) job.companyName = company;
      const description = container.find('.description, .job-description, p').first().text().trim();
      if (description) job.description = description;
      const location = container.find('.location, .job-location').first().text().trim();
      if (location) job.location = location;
      const typeRaw = container.find('.type, .job-type').first().text().trim().toLowerCase();
      if (typeRaw) {
        if (/full.?time/.test(typeRaw)) job.jobType = 'full_time';
        else if (/part.?time/.test(typeRaw)) job.jobType = 'part_time';
        else if (/contract/.test(typeRaw)) job.jobType = 'contract';
        else if (/intern/.test(typeRaw)) job.jobType = 'internship';
        else if (/remote/.test(typeRaw)) job.jobType = 'remote';
        else job.jobType = typeRaw;
      }
      const sourceUrl = container.find('a[href]').first().attr('href');
      if (sourceUrl) job.sourceUrl = sourceUrl;
      const posted = container.find('time[datetime]').first().attr('datetime');
      if (posted) job.postedDateIsoString = posted;
      const deadline = container.find('.deadline, time[datetime][class*="deadline"]').first().attr('datetime');
      if (deadline) job.deadlineIsoString = deadline;
      const salaryText = container.find('.salary, .pay, .compensation').first().text();
      if (salaryText) {
        const rangeMatch = salaryText.replace(/[^0-9.,\-]/g, '').match(/([\d.,]+)\s*-\s*([\d.,]+)/);
        if (rangeMatch) {
          const min = parseFloat(rangeMatch[1].replace(/,/g, ''));
          const max = parseFloat(rangeMatch[2].replace(/,/g, ''));
          if (!isNaN(min)) job.salaryMin = min;
          if (!isNaN(max)) job.salaryMax = max;
        }
        const curMatch = salaryText.match(/[A-Z]{3}|[$€£]/);
        if (curMatch) job.salaryCurrency = curMatch[0];
      }
      result.push(job);
    });
  }
} catch (e) {}