var jobContainers = $('div.post-body');
if (jobContainers.length === 0) {
  jobContainers = $('div.post');
}
if (jobContainers.length === 0) {
  jobContainers = $('article');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.entry-content');
}

jobContainers.each(function() {
  var title = $(this).find('h1, h2, h3').first().text().trim();
  if (!title) return;

  var job = {
    title: title,
    sourceUrl: $('meta[property="og:url"]').attr('content'),
    description: $(this).text().trim()
  };

  var companyName = $(this).find('span.author').text().trim() || $(this).find('span.fn').text().trim();
  if (companyName) {
    job.companyName = companyName;
  }

  var location = $(this).find('span.location').text().trim() || $(this).find('strong:contains("Location:")').next().text().trim();
  if (location) {
    job.location = location;
  }

  var postedDate = $(this).find('span.published').text().trim() || $(this).find