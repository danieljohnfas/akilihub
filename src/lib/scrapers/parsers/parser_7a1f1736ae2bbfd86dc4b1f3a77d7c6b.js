const jobCards = $('[data-testid="job-card"], .job-card, .job-listing, article.job, .vacancy-item, [class*="job-"][class*="card"], [class*="vacancy"][class*="item"]');
if (jobCards.length === 0) {
  const possibleContainers = $('main .grid > div, main .list > div, section.jobs > div, .jobs-container > div, [class*="job"][class*="list"] > div');
  if (possibleContainers.length > 0) {
    possibleContainers.each((i, el) => {
      const $el = $(el);
      const titleEl = $el.find('h3, h2, .title, [class*="title"]').first();
      const title = titleEl.text().trim();
      if (title && title.length > 3 && !/^(jobs?|browse|filter|search|category|location|page|load more|view all)$/i.test(title)) {
        const linkEl = $el.find('a[href*="/job"], a[href*="/vacancy"], a[href*="/position"]').first();
        const sourceUrl = linkEl.attr('href') ? new URL(linkEl.attr('href'), 'https://nafasi.io').href : '';
        const companyEl = $el.find('[class*="company"], [class*="employer"], .organization').first();
        const companyName = companyEl.text().trim() || 'Nafasi';
        const locationEl = $el.find('[class*="location"], [class*="city"], .place').first();
        const location = locationEl.text().trim() || 'Dodoma, Tanzania';
        const descEl = $el.find('[class*="description"], [class*="summary"], .excerpt, p').first();
        const description = descEl.text().trim().slice(0, 500);
        const dateEl = $el.find('time, [class*="date"], [class*="posted"]').first();
        let postedDateIsoString = '';
        if (dateEl.length) {
          const dt = dateEl.attr('datetime') || dateEl.text().trim();
          const parsed = new Date(dt);
          if (!isNaN(parsed)) postedDateIsoString = parsed.toISOString();
        }
        result.push({
          title,
          companyName,
          description,
          location,
          jobType: '',
          sourceUrl,
          postedDateIsoString,
          deadlineIsoString: '',
          salaryMin: null,
          salaryMax: null,
          salaryCurrency: 'TZS'
        });
      }
    });
  }
} else {
  jobCards.each((i, el) => {
    const $el = $(el);
    const titleEl = $el.find('h3, h2, .title, [class*="title"], a[href*="/job"]').first();
    const title = titleEl.text().trim();
    if (!title || title.length < 3) return;
    const linkEl = $el.find('a[href*="/job"], a[href*="/vacancy"], a[href*="/position"]').first();
    const sourceUrl = linkEl.attr('href') ? new URL(linkEl.attr('href'), 'https://nafasi.io').href : '';
    const companyEl = $el.find('[class*="company"], [class*="employer"], .organization').first();
    const companyName = companyEl.text().trim() || 'Nafasi';
    const locationEl = $el.find('[class*="location"], [class*="city"], .place').first();
    const location = locationEl.text().trim() || 'Dodoma, Tanzania';
    const descEl = $el.find('[class*="description"], [class*="summary"], .excerpt, p').first();
    const description = descEl.text().trim().slice(0, 500);
    const dateEl = $el.find('time, [class*="date"], [class*="posted"]').first();
    let postedDateIsoString = '';
    if (dateEl.length) {
      const dt = dateEl.attr('datetime') || dateEl.text().trim();
      const parsed = new Date(dt);
      if (!isNaN(parsed)) postedDateIsoString = parsed.toISOString();
    }
    result.push({
      title,
      companyName,
      description,
      location,
      jobType: '',
      sourceUrl,
      postedDateIsoString,
      deadlineIsoString: '',
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: 'TZS'
    });
  });
}