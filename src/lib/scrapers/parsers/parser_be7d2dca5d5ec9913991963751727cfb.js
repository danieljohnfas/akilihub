var jobContainers = $('article');
if (jobContainers.length === 0) {
  jobContainers = $('div.post-content');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.entry-content');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.content-area');
}

jobContainers.each(function() {
  var job = {};
  var title = $(this).find('h1.entry-title').text().trim();
  if (title) {
    job.title = title;
  } else {
    title = $(this).find('h1.post-title').text().trim();
    if (title) {
      job.title = title;
    }
  }
  
  if (!job.title) return;

  var companyName = $(this).find('span.author').text().trim();
  if (companyName) {
    job.companyName = companyName;
  } else {
    companyName = $(this).find('span.publisher').text().trim();
    if (companyName) {
      job.companyName = companyName;
    }
  }

  var description = $(this).find('div.entry-content').text().trim();
  if (description) {
    job.description = description;
  } else {
    description