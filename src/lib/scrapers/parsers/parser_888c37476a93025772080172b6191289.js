const jobContainers = $('[data-testid="job-card"], .job-listing, .job-item, article.job, .vacancy, .position, [class*="job-"], [class*="vacancy"]');
if (jobContainers.length === 0) {
  const possibleTitles = $('h1, h2, h3, h4, h5, h6, .title, [class*="title"]').filter((i, el) => {
    const text = $(el).text().toLowerCase();
    return text.includes('engineer') || text.includes('developer') || text.includes('manager') || text.includes('analyst') || text.includes('designer') || text.includes('specialist') || text.includes('coordinator') || text.includes('director') || text.includes('lead') || text.includes('architect') || text.includes('consultant') || text.includes('recruiter') || text.includes('sales') || text.includes('marketing') || text.includes('hr') || text.includes('human resources') || text.includes('finance') || text.includes('accountant') || text.includes('operations') || text.includes('product') || text.includes('data') || text.includes('software') || text.includes('frontend') || text.includes('backend') || text.includes('fullstack') || text.includes('devops') || text.includes('qa') || text.includes('quality assurance') || text.includes('test') || text.includes('support') || text.includes('customer success') || text.includes('admin') || text.includes('assistant') || text.includes('intern') || text.includes('trainee');
  });
  if (possibleTitles.length === 0) {
  } else {
    possibleTitles.each((i, el) => {
      const container = $(el).closest('[class*="card"], [class*="item"], [class*="listing"], article, div').first();
      const title = $(el).text().trim();
      const companyName = container.find('[class*="company"], [class*="employer"], [class*="org"]').first().text().trim() || '';
      const location = container.find('[class*="location"], [class*="place"], [class*="city"], [class*="region"]').first().text().trim() || '';
      const description = container.find('[class*="description"], [class*="summary"], [class*="excerpt"], p').first().text().trim() || '';
      const linkEl = container.find('a[href*="/job"], a[href*="/career"], a[href*="/position"], a[href*="/vacancy"]').first();
      const sourceUrl = linkEl.length ? linkEl.attr('href') : '';
      const postedText = container.find('[class*="date"], [class*="posted"], [class*="time"], time').first().text().trim();
      let postedDateIsoString = '';
      if (postedText) {
        const parsed = new Date(postedText);
        if (!isNaN(parsed.getTime())) postedDateIsoString = parsed.toISOString();
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
        salaryCurrency: ''
      });
    });
  }
}