const jobContainers = $('[class*="job"], [class*="vacancy"], [class*="position"], [class*="career"], [class*="listing"]')
  .filter(function () {
    const $c = $(this);
    // Consider it a job if it has a visible title element
    const titleEl = $c.find('h1, h2, h3, a').filter(function () {
      return $(this).text().trim().length > 0;
    }).first();
    return titleEl.length > 0;
  });

if (jobContainers.length === 0) {
  // No obvious job postings – leave result empty
} else {
  jobContainers.each(function () {
    const $c = $(this);

    const title = $c.find('h1, h2, h3, a')
      .filter((i, el) => $(el).text().trim())
      .first()
      .text()
      .trim();

    if (!title) return; // skip if no clear title

    const companyName = $c.find('[class*="company"], [class*="employer"], .company-name')
      .first()
      .text()
      .trim() || null;

    const description = $c.find('[class*="description"], .job-description, .entry-content')
      .first()
      .text()
      .trim() || null;

    const location = $c.find('[class*="location"], .job-location')
      .first()
      .text()
      .trim() || null;

    const typeText = $c.find('[class*="type"], .job-type')
      .first()
      .text()
      .toLowerCase();

    let jobType = null;
    if (/full\s*time/.test(typeText)) jobType = 'full_time';
    else if (/part\s*time/.test(typeText)) jobType = 'part_time';
    else if (/contract/.test(typeText)) jobType = 'contract';
    else if (/internship/.test(typeText)) jobType = 'internship';
    else if (/remote/.test(typeText)) jobType = 'remote';

    const sourceUrl = $c.find('a[href]').first().attr('href') || null;

    const postedDateIsoString = $c.find('time[datetime]').first().attr('datetime') || null;

    const deadlineIsoString = $c.find('.deadline time[datetime]').first().attr('datetime')
      || $c.find('[class*="deadline"]').first().text().trim() || null;

    const salaryText = $c.find('[class*="salary"], .salary')
      .first()
      .text()
      .replace(/[\s,]/g, '')
      .toLowerCase();

    let salaryMin = null;
    let salaryMax = null;
    let salaryCurrency = null;

    if (salaryText) {
      const currencyMatch = salaryText.match(/(usd|eur|gbp|ngn|₦|\$|€|£)/i);
      if (currencyMatch) salaryCurrency = currencyMatch[0].toUpperCase().replace('NGN', 'NGN');

      const rangeMatch = salaryText.match(/(\d+(?:\.\d+)?)[k]?[-–to]+(\d+(?:\.\d+)?)[k]?/i);
      if (rangeMatch) {
        const factor = /k/.test(rangeMatch[1]) ? 1000 : 1;
        salaryMin = parseFloat(rangeMatch[1].replace('k', '')) * factor;
        salaryMax = parseFloat(rangeMatch[2].replace('k', '')) * factor;
      } else {
        const singleMatch = salaryText.match(/(\d+(?:\.\d+)?)[k]?/i);
        if (singleMatch) {
          const factor = /k/.test(singleMatch[1]) ? 1000 : 1;
          salaryMin = salaryMax = parseFloat(singleMatch[1].replace('k', '')) * factor;
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
      salaryCurrency,
    });
  });
}