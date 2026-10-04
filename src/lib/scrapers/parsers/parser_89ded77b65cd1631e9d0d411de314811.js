var jobContainers = $('div.job-listing, div.job, div.job-posting, div.job-opening, div.vacancy, div.employment-opportunity');
if (jobContainers.length === 0) {
  var jobContainers = $('article, div.post, div.blog-post, div.news-article');
  if (jobContainers.length > 0) {
    jobContainers.each(function() {
      var title = $(this).find('h1, h2, h3, h4, h5, h6').first().text().trim();
      if (title.toLowerCase().includes('job') || title.toLowerCase().includes('vacancy') || title.toLowerCase().includes('employment opportunity')) {
        var job = {};
        job.title = title;
        job.description = $(this).find('p').text().trim();
        job.sourceUrl = $('meta[property="og:url"]').attr('content');
        result.push(job);
      }
    });
  }
} else {
  jobContainers.each(function() {
    var job = {};
    job.title = $(this).find('h1, h2, h3, h4, h5, h6').first().text().trim();
    job.companyName = $(this).find('span.company-name