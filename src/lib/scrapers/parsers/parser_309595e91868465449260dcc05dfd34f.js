var jobContainers = $('script[type="application/ld+json"]');
if (jobContainers.length === 0) {
  result = [];
} else {
  var jobs = JSON.parse(jobContainers.html());
  for (var i = 0; i < jobs.length; i++) {
    if (jobs[i]['@type'] === 'SearchResultsPage') {
      var itemList = jobs[i].mainEntity.itemListElement;
      for (var j = 0; j < itemList.length; j++) {
        var job = {};
        job.title = itemList[j].item.name;
        job.sourceUrl = itemList[j].item.url;
        result.push(job);
      }
    }
  }
}