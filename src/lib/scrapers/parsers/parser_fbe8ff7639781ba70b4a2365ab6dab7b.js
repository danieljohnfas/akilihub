result = [];

if ($('article').length > 0) {
  $('article').each((index, article) => {
    let job = {};
    job.title = $(article).find('.job-title').text().trim();
    job.companyName = $(article).find('.company-name').text().trim();
    job.description = $(article).find('.job-description').text().trim();
    job.location = $(article).find('.job-location').text().trim();
    job.jobType = $(article).find('.job-type').text().trim();
    job.sourceUrl = $(article).find('.job-link').attr('href');
    job.postedDateIsoString = $(article).find('.posted-date').attr('datetime');
    job.deadlineIsoString = $(article).find('.deadline').attr('datetime');
    job.salaryMin = parseInt($(article).find('.salary-min').text().trim().replace(/[^0-9]/g, ''));
    job.salaryMax = parseInt($(article).find('.salary-max').text().trim().replace(/[^0-9]/g, ''));
    job.salaryCurrency = $(article).find('.salary-currency').text().trim();

    if (job.title) {
      result.push(job);
    }
  });
}