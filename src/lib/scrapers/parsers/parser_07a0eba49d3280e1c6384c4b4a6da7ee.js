const jobContainers = $('article');
if (jobContainers.length === 0) {
  result = [];
} else {
  jobContainers.each(function() {
    const job = {};
    const title = $(this).find('h1').text().trim();
    if (title) {
      job.title = title;
      const companyName = $(this).find('.company').text().trim();
      if (companyName) {
        job.companyName = companyName;
      }
      const description = $(this).find('.job-description').text().trim();
      if (description) {
        job.description = description;
      }
      const location = $(this).find('.job-location').text().trim();
      if (location) {
        job.location = location;
      }
      const jobType = $(this).find('.job-type').text().trim();
      if (jobType) {
        job.jobType = jobType;
      }
      const sourceUrl = $(this).find('a').attr('href');
      if (sourceUrl) {
        job.sourceUrl = sourceUrl;
      }
      const postedDate = $(this).find('.posted-date').text().trim();
      if (postedDate) {
        job.postedDateIsoString = new Date