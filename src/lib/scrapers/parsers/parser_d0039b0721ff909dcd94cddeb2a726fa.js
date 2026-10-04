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
  var job = {};
  var title = $(this).find('h2, h3, h4, h5, h6').first();
  if (title.length > 0) {
    job.title = title.text().trim();
  }
  var text = $(this).text();
  if (text.toLowerCase().includes('job') || text.toLowerCase().includes('vacancy') || text.toLowerCase().includes('career')) {
    var companyNameMatch = text.match(/company\:? ?([a-zA-Z0-9\s]+)/i);
    if (companyNameMatch) {
      job.companyName = companyNameMatch[1].trim();
    }
    var locationMatch = text.match(/location\:? ?([a-zA-Z0-9\s]+)/i);
    if (locationMatch) {
      job.location = locationMatch[1].trim();
    }
    var jobTypeMatch = text