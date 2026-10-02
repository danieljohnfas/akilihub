let jobContainers = $('.single-post');

jobContainers.each((index, element) => {
  let job = {};

  // Extracting job title
  job.title = $(element).find('.entry-title').text().trim();

  // Extracting company name
  job.companyName = $(element).find('meta[property="article:publisher"]').attr('content').split('/').pop().replace(/-/g, ' ').replace(/\d+/g, '').trim();

  // Extracting job description
  job.description = $(element).find('.entry-content').text().trim();

  // Extracting location
  job.location = $(element).find('.job-location').text().trim();

  // Extracting job type
  job.jobType = $(element).find('.job-type').text().trim().toLowerCase();

  // Extracting source URL
  job.sourceUrl = $(element).find('meta[property="og:url"]').attr('content');

  // Extracting posted date
  job.postedDateIsoString = $(element).find('meta[property="article:published_time"]').attr('content');

  // Extracting deadline date
  job.deadlineIsoString = $(element).find('.job-deadline').text().trim();

  // Extracting salary information
  let salaryText = $(element).find('.job-salary').text().trim();
  let salaryMatches = salaryText.match(/(\d+,\d+|\d+)/g);
  if (salaryMatches) {
    job.salaryMin = parseInt(salaryMatches[0].replace(/,/g, ''));
    job.salaryMax = salaryMatches.length > 1 ? parseInt(salaryMatches[1].replace(/,/g)) : job.salaryMin;
  }

  // Extracting salary currency
  let currencyMatch = salaryText.match(/([A-Z]{3})/);
  if (currencyMatch) {
    job.salaryCurrency = currencyMatch[0];
  }

  // Pushing the job to the result array
  result.push(job);
});