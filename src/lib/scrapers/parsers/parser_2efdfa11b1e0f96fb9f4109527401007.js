let jobCards = $('.job-card, .job-listing, .listing-item, .search-result, .job, article[data-testid="job-card"], li[data-testid="job-item"]');

jobCards.each(function () {
  let container = $(this);

  let title = container.find('h1, h2, h3, .job-title, .title, a[data-testid="job-title"]').first().text().trim();
  if (!title) return;

  let companyName = container.find('.company, .company-name, .employer, a[data-testid="company-name"]').first().text().trim() || null;
  let location = container.find('.location, .job-location, span[data-testid="location"]').first().text().trim() || null;
  let description = container.find('.description, .job-description, p[data-testid="description"]').first().text().trim() || null;
  let jobType = container.find('.job-type, .type, span[data-testid="job-type"]').first().text().trim().toLowerCase() || null;
  let sourceUrl = container.find('a[href]').first().attr('href') || null;
  let postedDateIsoString = container.find('time[datetime]').first().attr('datetime') || null;
  let deadlineIsoString = container.find('.deadline time[datetime]').first().attr('datetime') || null;

  let salaryText = container.find('.salary, .compensation, span[data-testid="salary"]').first().text().trim();
  let salaryMin = null, salaryMax = null, salaryCurrency = null;
  if (salaryText) {
    let match = salaryText.replace(/,/g, '').match(/([A-Z]{3})?\s?(\d+(?:\.\d+)?)(?:\s?[-–]\s?(\d+(?:\.\d+)?))?/i);
    if (match) {
      salaryCurrency = match[1] ? match[1].toUpperCase() : null;
      salaryMin = parseFloat(match[2]) || null;
      salaryMax = match[3] ? parseFloat(match[3]) : salaryMin;
    }
  }

  let job = {
    title,
    companyName,
    description,
    location,
    jobType: jobType || null,
    sourceUrl,
    postedDateIsoString,
    deadlineIsoString,
    salaryMin,
    salaryMax,
    salaryCurrency
  };

  result.push(job);
});