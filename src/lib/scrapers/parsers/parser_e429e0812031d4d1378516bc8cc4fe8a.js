var jobListElements = $('script[type="application/ld+json"]');
if (jobListElements.length === 0) {
  result = [];
} else {
  var jobList = JSON.parse(jobListElements.html());
  var itemListElement;
  for (var i = 0; i < jobList.length; i++) {
    if (jobList[i]['@type'] === 'ItemList') {
      itemListElement = jobList[i];
      break;
    }
  }
  if (!itemListElement) {
    result = [];
  } else {
    for (var i = 0; i < itemListElement.itemListElement.length; i++) {
      var job = {};
      job.title = itemListElement.itemListElement[i].name;
      job.sourceUrl = itemListElement.itemListElement[i].url;
      result.push(job);
    }
  }
}