const jobContainers = $('article.post');
if (jobContainers.length === 0) {
  const jobListings = $('div.job-listing');
  if (jobListings.length > 0) {
    jobListings.each(function() {
      const job = {};
      job.title = $(this).find('h2.job-title').text().trim();
      job.companyName = $(this).find('span.company-name').text().trim();
      job.description = $(this).find('div.job-description').text().trim();
      job.location = $(this).find('span.job-location').text().trim();
      job.sourceUrl = $(this).find('a.job-url').attr('href');
      result.push(job);
    });
  } else {
    const jobPosts = $('div.job-post');
    if (jobPosts.length > 0) {
      jobPosts.each(function() {
        const job = {};
        job.title = $(this).find('h2.job-title').text().trim();
        job.companyName = $(this).find('span.company-name').text().trim();
        job.description = $(this).find('div.job-description').text().trim();
        job.location = $(this).find('span.job-location').