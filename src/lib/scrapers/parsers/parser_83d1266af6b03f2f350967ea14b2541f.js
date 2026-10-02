if (html.includes('job-search') && html.includes('job openings')) {
  const jobListings = $('.job-listing');

  jobListings.each((index, element) => {
    const job = {};
    job.title = $(element).find('.job-title').text().trim();
    job.companyName = $(element).find('.company-name').text().trim();
    job.description = $(element).find('.job-description').text().trim();
    job.location = $(element).find('.job-location').text().trim();
    job.jobType = $(element).find('.job-type').text().trim();
    job.sourceUrl = $(element).find('.job-link').attr('href');
    job.postedDateIsoString = $(element).find('.posted-date').data('posted-date');
    job.deadlineIsoString = $(element).find('.deadline-date').data('deadline-date');
    job.salaryMin = $(element).find('.salary-range').data('salary-min');
    job.salaryMax = $(element).find('.salary-range').data('salary-max');
    job.salaryCurrency = $(element).find('.salary-range').data('salary-currency');

    result.push(job);
  });
}