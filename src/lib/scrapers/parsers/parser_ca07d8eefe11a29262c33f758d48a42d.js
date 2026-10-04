var jobContainers = $('article');
if (jobContainers.length > 0) {
  jobContainers.each(function() {
    var job = {};
    job.title = $(this).find('h1').text().trim();
    job.companyName = $(this).find('strong:contains("Company:")').next().text().trim();
    job.description = $(this).find('div.entry-content').text().trim();
    job.location = $(this).find('strong:contains("Location:")').next().text().trim();
    job.sourceUrl = window.location.href;
    var postedDate = $(this).find('strong:contains("Posted:")').next().text().trim();
    if (postedDate) {
      job.postedDateIsoString = new Date(postedDate).toISOString();
    }
    var deadline = $(this).find('strong:contains("Deadline:")').next().text().trim();
    if (deadline) {
      job.deadlineIsoString = new Date(deadline).toISOString();
    }
    result.push(job);
  });
}