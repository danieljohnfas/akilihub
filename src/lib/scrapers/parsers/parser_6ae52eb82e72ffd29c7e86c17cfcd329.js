var jobContainers = $('div.post-body');
if (jobContainers.length === 0) {
  jobContainers = $('article.post');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.entry-content');
}
if (jobContainers.length === 0) {
  jobContainers = $('div.post-content');
}

jobContainers.each(function() {
  var title = $(this).find('h1, h2, h3').first().text().trim();
  if (!title) return;
  
  var job = {
    title: title,
    companyName: '',
    description: $(this).text().trim(),
    location: '',
    jobType: '',
    sourceUrl: $('meta[property="og:url"]').attr('content'),
    postedDateIsoString: '',
    deadlineIsoString: '',
    salaryMin: '',
    salaryMax: '',
    salaryCurrency: ''
  };
  
  var metaDescription = $('meta[name="description"]').attr('content');
  if (metaDescription) {
    var match = metaDescription.match(/Position:\s*(.*?)\s*Qualifications and Requirements:/);
    if (match) {
      job.title = match[1].trim();
    }
  }
  
  result.push(job);
});