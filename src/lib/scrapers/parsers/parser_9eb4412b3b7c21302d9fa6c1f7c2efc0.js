const jobContainers = $('.job-listing');

if (jobContainers.length > 0) {
  jobContainers.each((index, jobElement) => {
    const job = {};
    job.title = $(jobElement).find('.job-title').text().trim();
    job.companyName = $(jobElement).find('.company-name').text().trim();
    job.description = $(jobElement).find('.job-description').text().trim();
    job.location = $(jobElement).find('.job-location').text().trim();
    job.jobType = $(jobElement).find('.job-type').text().trim().toLowerCase().replace(/ /g, '_');
    job.sourceUrl = $(jobElement).find('.job-link').attr('href').trim();
    job.postedDateIsoString = $(jobElement).find('.posted-date').data('iso-date').trim();
    job.deadlineIsoString = $(jobElement).find('.deadline-date').data('iso-date').trim();
    const salaryText = $(jobElement).find('.salary').text().trim();
    const salaryMatch = salaryText.match(/(\d+)\s*-\s*(\d+)\s*(\w+)/);
    if (salaryMatch) {
      job.salaryMin = parseInt(salaryMatch[1], 10);
      job.salaryMax = parseInt(salaryMatch[2], 10);
      job.salaryCurrency = salaryMatch[3].trim();
    }

    result.push(job);
  });
}