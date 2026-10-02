const jobContainers = $('.promocard[data-astro-cid-dqgmlf3e]');

jobContainers.each((index, container) => {
  const job = {};

  job.title = $(container).find('.pc-t[data-astro-cid-dqgmlf3e]').text().trim();
  job.companyName = $(container).find('.pc-logo[data-astro-cid-dqgmlf3e]').attr('alt') || $(container).find('.pc-logo[data-astro-cid-dqgmlf3e]').text().trim();
  job.description = $(container).find('.pc-m[data-astro-cid-dqgmlf3e]').text().trim();
  job.location = $(container).find('.pc-m[data-astro-cid-dqgmlf3e]').text().trim().split('at ')[1];
  job.sourceUrl = $(container).attr('href');
  job.postedDateIsoString = null; // Not available in the provided HTML
  job.deadlineIsoString = null; // Not available in the provided HTML
  job.salaryMin = null; // Not available in the provided HTML
  job.salaryMax = null; // Not available in the provided HTML
  job.salaryCurrency = null; // Not available in the provided HTML
  job.jobType = null; // Not available in the provided HTML

  result.push(job);
});