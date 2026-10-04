var jobContainers = $('script[type="application/ld+json"]');
if (jobContainers.length === 0) {
  result = [];
} else {
  var jobs = JSON.parse(jobContainers.html());
  if (jobs['@graph'] && jobs['@graph'].length > 1 && jobs['@graph'][1]['@type'] === 'SearchResultsPage' && jobs['@graph'][1].mainEntity && jobs['@graph'][1].mainEntity.itemListElement) {
    var itemList = jobs['@graph'][1].mainEntity.itemListElement;
    for (var i = 0; i < itemList.length; i++) {
      var item = itemList[i].item;
      if (item && item.name && item.url) {
        var job = {
          title: item.name,
          sourceUrl: item.url,
          companyName: '',
          description: '',
          location: '',
          jobType: '',
          postedDateIsoString: '',
          deadlineIsoString: '',
          salaryMin: '',
          salaryMax: '',
          salaryCurrency: ''
        };
        result.push(job);
      }
    }
  } else {
    result = [];
  }
}