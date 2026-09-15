const jobSelectors = [
  '.job-listing',
  '.job',
  '.listing-item',
  'article.post',
  '.entry-content li'
];

let found = false;

jobSelectors.forEach(sel => {
  $(sel).each((_, el) => {
    const container = $(el);
    const title = container.find('h1, h2, h3, .job-title, a').first().text().trim();
    if (!title) return;
    found = true;
    const job = {
      title,
      companyName: container.find('.company, .company-name').first().text().trim() || undefined,
      description: container.find('.description, .job-description, p').first().text().trim() || undefined,
      location: container.find('.location, .job-location').first().text().trim() || undefined,
      jobType: (function() {
        const txt = container.find('.type, .job-type').first().text().toLowerCase();
        if (txt.includes('full')) return 'full_time';
        if (txt.includes('part')) return 'part_time';
        if (txt.includes('contract')) return 'contract';
        if (txt.includes('intern')) return 'internship';
        if (txt.includes('remote')) return 'remote';
        return undefined;
      })(),
      sourceUrl: container.find('a').first().attr('href') || undefined,
      postedDateIsoString: (function() {
        const time = container.find('time[datetime]').first().attr('datetime');
        return time ? new Date(time).toISOString() : undefined;
      })(),
      deadlineIsoString: undefined,
      salaryMin: undefined,
      salaryMax: undefined,
      salaryCurrency: undefined
    };
    result.push(job);
  });
});

if (!found) {
  // Ensure result stays empty if no job titles were detected
  result.length = 0;
}