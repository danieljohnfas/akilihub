result = [];

if ($('title').text().includes('Jobs') || $('title').text().includes('Job')) {
  $('.job-container').each((index, jobElement) => {
    const job = {};
    job.title = $(jobElement).find('.job-title').text().trim();
    job.companyName = $(jobElement).find('.company-name').text().trim();
    job.description = $(jobElement).find('.job-description').text().trim();
    job.location = $(jobElement).find('.job-location').text().trim();
    job.jobType = $(jobElement).find('.job-type').text().trim().toLowerCase().replace(/\s+/g, '_');
    job.sourceUrl = $(jobElement).find('.job-link').attr('href');
    job.postedDateIsoString = $(jobElement).find('.posted-date').attr('datetime');
    job.deadlineIsoString = $(jobElement).find('.deadline-date').attr('datetime');
    job.salaryMin = parseInt($(jobElement).find('.salary-min').text().replace(/\D/g, ''));
    job.salaryMax = parseInt($(jobElement).find('.salary-max').text().replace(/\D/g, ''));
    job.salaryCurrency = $(jobElement).find('.salary-currency').text().trim();

    result.push(job);
  });
}