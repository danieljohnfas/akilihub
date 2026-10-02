try {
  const jobContainers = $('article');
  if (jobContainers.length === 0) {
    return;
  }
  jobContainers.each(function() {
    const job = {};
    job.title = $(this).find('h1').text().trim();
    if (!job.title) {
      return;
    }
    job.companyName = $(this).find('strong:contains("Company:")').next().text().trim();
    job.description = $(this).find('div:contains("JOB PURPOSE")').next().text().trim();
    job.location = $(this).find('strong:contains("Location:")').next().text().trim();
    job.sourceUrl = $('meta[property="og:url"]').attr('content');
    job.postedDateIsoString = $('meta[property="article:published_time"]').attr('content');
    result.push(job);
  });
} catch (e) {
  console.log(e);
}