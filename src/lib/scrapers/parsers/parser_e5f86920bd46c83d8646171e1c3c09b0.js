var jobContainers = $('script[type="application/ld+json"]');
if (jobContainers.length === 0) {
  result = [];
} else {
  var jobs = JSON.parse(jobContainers.html());
  if (jobs['@graph'] && jobs['@graph'].length > 1 && jobs['@graph'][1]['@type'] === 'SearchResultsPage' && jobs['@graph'][1]['mainEntity'] && jobs['@graph'][1]['mainEntity']['@type'] === 'ItemList') {
    var itemList = jobs['@graph'][1]['mainEntity']['itemListElement'];
    if (itemList && itemList.length > 0) {
      for (var i = 0; i < itemList.length; i++) {
        var job = {};
        job.title = itemList[i]['item']['name'];
        job.sourceUrl = itemList[i]['item']['url'];
        job.companyName = itemList[i]['item']['name'].split(' at ')[1];
        result.push(job);
      }
    }
  }
}