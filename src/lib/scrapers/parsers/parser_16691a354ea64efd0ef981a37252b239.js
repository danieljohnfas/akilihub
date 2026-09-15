var jobContainers = $('script[type="application/ld+json"]');
if (jobContainers.length > 0) {
    var jsonData = JSON.parse(jobContainers.html());
    if (jsonData['@graph'] && jsonData['@graph'].length > 1 && jsonData['@graph'][1]['@type'] === 'SearchResultsPage') {
        var itemList = jsonData['@graph'][1]['mainEntity']['itemListElement'];
        if (itemList && itemList.length > 0) {
            itemList.forEach(function(item) {
                var job = {};
                job.title = item['item']['name'];
                job.sourceUrl = item['item']['url'];
                result.push(job);
            });
        }
    }
}