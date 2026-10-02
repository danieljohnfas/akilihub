var jobContainers = $('article');
if (jobContainers.length === 0) {
  var jobContainers = $('div.entry-content');
}
if (jobContainers.length === 0) {
  result = [];
} else {
  jobContainers.each(function() {
    var title = $(this).find('h2, h1').first().text().trim();
    if (title) {
      var job = {
        title: title,
        sourceUrl: $('meta[property="og:url"]').attr('content'),
        postedDateIsoString: $('meta[property="article:published_time"]').attr('content')
      };
      var text = $(this).find('p').text();
      if (text) {
        job.description = text.trim();
      }
      var companyName = $('meta[property="og:site_name"]').attr('content');
      if (companyName) {
        job.companyName = companyName;
      }
      result.push(job);
    }
  });
}