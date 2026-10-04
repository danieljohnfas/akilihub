var jobContainers = $('article');
if (jobContainers.length === 0) {
  jobContainers = $('div.post-content');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.entry-content');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.content');
}

jobContainers.each(function() {
  var job = {};
  var title = $(this).find('h1, h2, h3, h4, h5, h6').first().text().trim();
  if (title) {
    job.title = title;
  } else {
    return;
  }
  
  var companyName = $(this).find('span.author, span.company').text().trim();
  if (companyName) {
    job.companyName = companyName;
  }
  
  var description = $(this).find('div.entry-content, div.post-content, div.content').text().trim();
  if (description) {
    job.description = description;
  }
  
  var location = $(this).find('span.location').text().trim();
  if (location) {
    job.location = location;
  }
  
  var jobType = $(this).find('span.job-type').text().trim();