var jobContainers = $('article, .job, .listing, .opportunity, .vacancy');
if (jobContainers.length === 0) {
  var jobTitle = $('title').text();
  if (jobTitle && jobTitle.toLowerCase().includes('hiring') || jobTitle.toLowerCase().includes('job') || jobTitle.toLowerCase().includes('opportunity')) {
    var job = {};
    job.title = jobTitle;
    job.companyName = $('meta[property="og:site_name"]').attr('content');
    job.description = $('meta[property="og:description"]').attr('content');
    job.location = $('title').text().match(/in (.*)/);
    if (job.location) {
      job.location = job.location[1];
    }
    job.sourceUrl = $('meta[property="og:url"]').attr('content');
    result.push(job);
  }
} else {
  jobContainers.each(function() {
    var job = {};
    job.title = $(this).find('h1, h2, h3, .title, .job-title').first().text().trim();
    if (job.title) {
      job.companyName = $(this).find('.company, .company-name').first().text().trim();
      job.description