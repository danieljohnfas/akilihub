const jobContainers = $('.job, .job-item, .listing, .vacancy, .position, article.job, li.job');

jobContainers.each((_, elem) => {
  const container = $(elem);

  const title = container.find('h1, h2, h3, .title, .job-title, a').first().text().trim();
  if (!title) return;

  const job = {
    title,
    companyName: container.find('.company, .company-name').first().text().trim() || undefined,
    description: container.find('.description, .job-description, p').first().text().trim() || undefined,
    location: container.find('.location, .job-location').first().text().trim() || undefined,
    jobType: (function () {
      const txt = container.find('.type, .job-type').first().text().toLowerCase();
      if (txt.includes('full')) return 'full_time';
      if (txt.includes('part')) return 'part_time';
      if (txt.includes('contract')) return 'contract';
      if (txt.includes('intern')) return 'internship';
      if (txt.includes('remote')) return 'remote';
      return undefined;
    })(),
    sourceUrl: container.find('a[href]').first().attr('href') || undefined,
    postedDateIsoString: (function () {
      const dateStr = container.find('time, .date-posted, .posted').first().attr('datetime') || container.find('time, .date-posted, .posted').first().text();
      const d = new Date(dateStr);
      return isNaN(d) ? undefined : d.toISOString();
    })(),
    deadlineIsoString: (function () {
      const dateStr = container.find('.deadline, .apply-by').first().attr('datetime') || container.find('.deadline, .apply-by').first().text();
      const d = new Date(dateStr);
      return isNaN(d) ? undefined : d.toISOString();
    })(),
    salaryMin: (function () {
      const txt = container.find('.salary, .salary-range').first().text();
      const match = txt.replace(/[^0-9\-]/g, '').match(/^(\d+)[\-\–](\d+)/);
      return match ? parseInt(match[1], 10) : undefined;
    })(),
    salaryMax: (function () {
      const txt = container.find('.salary, .salary-range').first().text();
      const match = txt.replace(/[^0-9\-]/g, '').match(/^(\d+)[\-\–](\d+)/);
      return match ? parseInt(match[2], 10) : undefined;
    })(),
    salaryCurrency: (function () {
      const txt = container.find('.salary, .salary-range').first().text();
      const match = txt.match(/([A-Z]{3}|[$€£])/);
      return match ? match[1] : undefined;
    })()
  };

  result.push(job);
});