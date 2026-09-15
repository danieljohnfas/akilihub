var jobContainers = $('article');
if (jobContainers.length === 0) {
  jobContainers = $('div.entry-content');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.post-content');
}
if (jobContainers.length > 0) {
  jobContainers.each(function() {
    var job = {};
    var title = $(this).find('h1, h2, h3, h4, h5, h6').first();
    if (title.length > 0) {
      job.title = title.text().trim();
    }
    var companyName = $(this).find('strong:contains("Company:")').next();
    if (companyName.length > 0) {
      job.companyName = companyName.text().trim();
    } else {
      companyName = $(this).find('strong:contains("Institution:")').next();
      if (companyName.length > 0) {
        job.companyName = companyName.text().trim();
      }
    }
    var description = $(this).find('p');
    if (description.length > 0) {
      job.description = description.text().trim();
    }
    var location = $(this).find('strong:contains("Location:")').next();