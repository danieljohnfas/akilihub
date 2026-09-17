$('.job-listing, .job-posting, .job-card, [data-job-id], .vacancy, .career-item, .position').each((i, el) => {
  const c = $(el);
  const title = c.find('.job-title, .title, h2, h3').first().text().trim();
  if (!title) return;
  result.push({
    title: title,
    companyName: c.find('.company, .company-name').first().text().trim(),
    description: c.find('.description, .job-description').first().text().trim(),
    location: c.find('.location, .job-location').first().text().trim(),
    jobType: '',
    sourceUrl: c.find('a').first().attr('href') || '',
    postedDateIsoString: '',
    deadlineIsoString: '',
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: ''
  });
});