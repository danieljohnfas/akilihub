result = [];

if ($('div.job-listing').length > 0) {
  $('div.job-listing').each((index, element) => {
    const job = {};
    job.title = $(element).find('h2.job-title').text().trim();
    job.companyName = $(element).find('div.company-name').text().trim();
    job.description = $(element).find('div.job-description').text().trim();
    job.location = $(element).find('div.job-location').text().trim();
    job.jobType = $(element).find('div.job-type').text().trim().toLowerCase();
    job.sourceUrl = $(element).find('a.job-link').attr('href');
    job.postedDateIsoString = $(element).find('div.posted-date').data('iso-date');
    job.deadlineIsoString = $(element).find('div.deadline').data('iso-date');
    const salaryText = $(element).find('div.salary').text().trim();
    const salaryMatch = salaryText.match(/(\d+)-(\d+)\s*(\w+)/);
    if (salaryMatch) {
      job.salaryMin = parseInt(salaryMatch[1], 10);
      job.salaryMax = parseInt(salaryMatch[2], 10);
      job.salaryCurrency = salaryMatch[3].toUpperCase();
    }
    result.push(job);
  });
}