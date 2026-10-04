const jobContainers = $('.job-listing, .job-item, .vacancy, article.job');
jobContainers.each((_, el) => {
  const container = $(el);
  const title = container.find('.job-title, h1, h2, h3').first().text().trim();
  if (!title) return;
  const job = {
    title,
    companyName: container.find('.company-name').text().trim() || null,
    description: container.find('.job-description, .description, p').text().trim() || null,
    location: container.find('.job-location, .location').text().trim() || null,
    jobType: null,
    sourceUrl: null,
    postedDateIsoString: null,
    deadlineIsoString: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null
  };
  result.push(job);
});