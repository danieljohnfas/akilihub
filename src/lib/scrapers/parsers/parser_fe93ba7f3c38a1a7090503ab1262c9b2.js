var jobContainers = $('script[type="application/ld+json"]');
if (jobContainers.length === 0) {
    result = [];
} else {
    var jobs = JSON.parse(jobContainers[0].innerHTML);
    if (jobs['@graph'].length > 1 && jobs['@graph'][1]['@type'] === 'SearchResultsPage') {
        var itemList = jobs['@graph'][1].mainEntity.itemListElement;
        for (var i = 0; i < itemList.length; i++) {
            var job = {};
            job.title = itemList[i].item.name;
            job.sourceUrl = itemList[i].item.url;
            job.companyName = 'MDAs & LGAs'; // default company name, may need to be adjusted based on actual HTML structure
            result.push(job);
        }
    } else {
        result = [];
    }
}