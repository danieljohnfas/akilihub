$('.job-listing, .job-posting, .career-item, .views-row').each((i, el) => {
  const $el = $(el);
  const title = $el.find('h2, h3, .title, .job-title').first().text().trim();
  if (!title) return;
  result.push({
    title: title,
    companyName: $el.find('.company, .company-name').first().text().trim(),
    description: $el.find('.description, .job-description').first().text().trim(),
    location: $el.find('.location, .job-location').first().text().trim(),
    jobType: '',
    sourceUrl: $el.find('a').attr('href') || '',
    postedDateIsoString: '',
    deadlineIsoString: '',
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: ''
  });
});