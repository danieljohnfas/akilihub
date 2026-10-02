const jobContainers = $('.schema-job').add($('.single-job-opening'));

jobContainers.each((index, element) => {
  const job = {};

  // Extract job title
  job.title = $(element).find('.job-title, .single-job-opening-title').text().trim();

  // Extract company name
  job.companyName = $(element).find('.job-company-name, .single-job-opening-company').text().trim();

  // Extract job description
  job.description = $(element).find('.job-description, .single-job-opening-description').text().trim();

  // Extract job location
  job.location = $(element).find('.job-location, .single-job-opening-location').text().trim();

  // Extract job type
  job.jobType = $(element).find('.job-type, .single-job-opening-type').text().trim().toLowerCase().replace(/ /g, '_');

  // Extract source URL
  job.sourceUrl = $(element).find('.job-title, .single-job-opening-title').attr('href') || window.location.href;

  // Extract posted date
  const postedDateRaw = $(element).find('.job-posted-date, .single-job-opening-posted').text().trim();
  job.postedDateIsoString = new Date(postedDateRaw).toISOString();

  // Extract deadline
  const deadlineRaw = $(element).find('.job-deadline, .single-job-opening-deadline').text().trim();
  job.deadlineIsoString = new Date(deadlineRaw).toISOString();

  // Extract salary
  const salaryText = $(element).find('.job-salary, .single-job-opening-salary').text().trim();
  const salaryMatch = salaryText.match(/(\d+[\.\d]*)\s*-\s*(\d+[\.\d]*)\s*(\w+)/);
  if (salaryMatch) {
    job.salaryMin = parseFloat(salaryMatch[1]);
    job.salaryMax = parseFloat(salaryMatch[2]);
    job.salaryCurrency = salaryMatch[3];
  }

  // Add the job to the result array
  result.push(job);
});