const jobContainers = $('.job-listing, .job, article.job, li.job-item');
if (jobContainers.length) {
  jobContainers.each((_, el) => {
    const container = $(el);
    const title = container.find('.job-title, h1, h2, h3').first().text().trim();
    if (!title) return;
    const job = {
      title,
      companyName: container.find('.company, .company-name').first().text().trim() || undefined,
      description: container.find('.description, .job-description').first().text().trim() || undefined,
      location: container.find('.location').first().text().trim() || undefined,
      jobType: (function() {
        const txt = container.find('.job-type').first().text().toLowerCase();
        if (/full\s*time/.test(txt)) return 'full_time';
        if (/part\s*time/.test(txt)) return 'part_time';
        if (/contract/.test(txt)) return 'contract';
        if (/internship/.test(txt)) return 'internship';
        if (/remote/.test(txt)) return 'remote';
        return undefined;
      })(),
      sourceUrl: container.find('a.apply-link').first().attr('href') || undefined,
      postedDateIsoString: (function() {
        const date = container.find('.posted-date').first().attr('datetime') || container.find('.posted-date').first().text();
        return date ? new Date(date).toISOString() : undefined;
      })(),
      deadlineIsoString: (function() {
        const date = container.find('.deadline').first().attr('datetime') || container.find('.deadline').first().text();
        return date ? new Date(date).toISOString() : undefined;
      })(),
      salaryMin: (function() {
        const txt = container.find('.salary').first().text();
        const match = txt.match(/(\d+[.,]?\d*)/);
        return match ? parseFloat(match[1].replace(',', '')) : undefined;
      })(),
      salaryMax: undefined,
      salaryCurrency: (function() {
        const txt = container.find('.salary').first().text();
        const match = txt.match(/([£$€])/);
        return match ? match[1] : undefined;
      })()
    };
    result.push(job);
  });
}