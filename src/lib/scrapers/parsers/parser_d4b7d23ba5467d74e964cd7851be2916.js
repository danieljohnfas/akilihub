var jobs = $('script[type="application/ld+json"]');
if (jobs.length === 0) {
  result = [];
} else {
  var jobData = JSON.parse(jobs.html());
  var jobList = jobData[1].mainEntity.itemListElement;
  jobList.forEach(function(job) {
    var jobObject = {};
    jobObject.title = job.item.name;
    jobObject.sourceUrl = job.item.url;
    result.push(jobObject);
  });
}