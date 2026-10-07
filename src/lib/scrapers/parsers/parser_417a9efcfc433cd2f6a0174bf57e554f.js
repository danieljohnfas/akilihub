var jobContainers = $('div.post-body.entry-content');
if (jobContainers.length === 0) {
  jobContainers = $('div.post');
}
if (jobContainers.length === 0) {
  jobContainers = $('article');
}
if (jobContainers.length === 0) {
  jobContainers = $('section');
}
if (jobContainers.length === 0) {
  result = [];
} else {
  jobContainers.each(function() {
    var job = {};
    var title = $(this).find('h2, h3, h4, h5, h6').first();
    if (title.length > 0) {
      job.title = title.text().trim();
    }
    var companyName = $(this).find('span.company').text();
    if (companyName) {
      job.companyName = companyName.trim();
    } else {
      var metaTag = $('meta[property="og:site_name"]');
      if (metaTag.length > 0) {
        job.companyName = metaTag.attr('content').trim();
      }
    }
    var description = $(this).find('p').first();
    if (description.length > 0) {
      job.description = description.text().trim();
    }
    var location = $(