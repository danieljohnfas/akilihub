const jobContainers = $('.entry-content .wp-block-columns, .entry-content .wp-block-media-text, .entry-content p, .entry-content li');

jobContainers.each((index, container) => {
  const job = {};

  const titleElement = $(container).find('strong, b, h1, h2, h3, h4, h5, h6').first();
  if (titleElement.length) {
    job.title = titleElement.text().trim();
  }

  const companyElement = $(container).find('.company-name').first();
  if (companyElement.length) {
    job.companyName = companyElement.text().trim();
  }

  const descriptionElement = $(container).find('p').first();
  if (descriptionElement.length) {
    job.description = descriptionElement.text().trim();
  }

  const locationElement = $(container).find('.location').first();
  if (locationElement.length) {
    job.location = locationElement.text().trim();
  }

  const jobTypeElement = $(container).find('.job-type').first();
  if (jobTypeElement.length) {
    job.jobType = jobTypeElement.text().trim().toLowerCase().replace(/\s+/g, '_');
  }

  const sourceUrlElement = $(container).find('a').first();
  if (sourceUrlElement.length) {
    job.sourceUrl = sourceUrlElement.attr('href').trim();
  }

  const postedDateElement = $(container).find('.posted-date').first();
  if (postedDateElement.length) {
    job.postedDateIsoString = postedDateElement.text().trim();
  }

  const deadlineElement = $(container).find('.deadline').first();
  if (deadlineElement.length) {
    job.deadlineIsoString = deadlineElement.text().trim();
  }

  const salaryElement = $(container).find('.salary').first();
  if (salaryElement.length) {
    const salaryText = salaryElement.text().trim();
    const salaryMatch = salaryText.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)\s*([a-zA-Z]{3})/);
    if (salaryMatch) {
      job.salaryMin = parseFloat(salaryMatch[1]);
      job.salaryMax = parseFloat(salaryMatch[2]);
      job.salaryCurrency = salaryMatch[3].toUpperCase();
    }
  }

  if (job.title) {
    result.push(job);
  }
});