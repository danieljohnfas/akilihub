var jobContainers = $('article');
if (jobContainers.length === 0) {
  jobContainers = $('div.entry-content');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.post-content');
}
if (jobContainers.length > 0) {
  jobContainers.each(function() {
    var title = $(this).find('h1.entry-title').text().trim();
    if (!title) {
      title = $(this).find('h1.post-title').text().trim();
    }
    if (title) {
      var companyName = '';
      var description = $(this).find('div.entry-content').html().trim();
      if (!description) {
        description = $(this).find('div.post-content').html().trim();
      }
      var location = '';
      var jobType = '';
      var sourceUrl = $('meta[property="og:url"]').attr('content');
      var postedDateIsoString = $('meta[property="article:published_time"]').attr('content');
      var deadlineIsoString = '';
      var salaryMin = '';
      var salaryMax = '';
      var salaryCurrency = '';
      var job = {
        title: title,
        companyName: companyName,
        description: description,
        location: location,