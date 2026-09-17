result.push({
  title: $('.job-title, .job-card__title, .listing-title, .职位标题').first().text().trim(),
  companyName: $('.job-company, .company-name, .job-card__company').first().text().trim(),
  description: $('.job-description, .job-summary, .listing-description').first().text().trim(),
  location: $('.job-location, .location, .job-card__location').first().text().trim(),
  jobType: $('.job-type, .employment-type, .job-card__type').first().text().trim(),
  sourceUrl: $('.job-link, .job-card a, .listing a').first().attr('href') || '',
  postedDateIsoString: $('.job-posted, .posted-date, .job-card__date').first().attr('datetime') || $('.job-posted, .posted-date, .job-card__date').first().text().trim(),
  deadlineIsoString: $('.job-deadline, .deadline, .application-deadline').first().attr('datetime') || $('.job-deadline, .deadline, .application-deadline').first().text().trim(),
  salaryMin: parseFloat($('.salary-min, .salary-range .min, .job-card__salary-min').first().text().replace(/[^0-9.]/g, '')) || undefined,
  salaryMax: parseFloat($('.salary-max, .salary-range .max, .job-card__salary-max').first().text().replace(/[^0-9.]/g, '')) || undefined,
  salaryCurrency: $('.salary-currency, .currency, .job-card__currency').first().text().trim()
});