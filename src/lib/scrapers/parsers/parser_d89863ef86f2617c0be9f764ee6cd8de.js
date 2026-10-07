var jobContainers = $('script[type="application/ld+json"]');
if (jobContainers.length === 0) {
  result = [];
} else {
  var jobs = JSON.parse(jobContainers.html());
  for (var i = 0; i < jobs.length; i++) {
    if (jobs[i]['@type'] === 'SearchResultsPage') {
      var itemList = jobs[i].mainEntity.itemListElement;
      for (var j = 0; j < itemList.length; j++) {
        var job = itemList[j].item;
        var jobObject = {};
        jobObject.title = job.name;
        jobObject.sourceUrl = job.url;
        result.push(jobObject);
      }
    }
  }
}