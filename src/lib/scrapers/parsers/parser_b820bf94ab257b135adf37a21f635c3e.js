var jobContainers = $('div');
jobContainers.each(function() {
  var jobTitle = $(this).find('h1, h2, h3, h4, h5, h6').text().trim();
  if (jobTitle && jobTitle.toLowerCase().includes('job') || jobTitle.toLowerCase().includes('position')) {
    var job = {};
    job.title = jobTitle;
    job.companyName = $(this).find('span:contains("Company:")').next().text().trim() || $(this).find('span:contains("company:")').next().text().trim();
    job.description = $(this).find('div:contains("Description:")').next().text().trim() || $(this).find('div:contains("description:")').next().text().trim();
    job.location = $(this).find('span:contains("Location:")').next().text().trim() || $(this).find('span:contains("location:")').next().text().trim();
    job.jobType = $(this).find('span:contains("Type:")').next().text().trim() || $(this).find('span:contains("type:")').next().text().trim();
    job.sourceUrl = '