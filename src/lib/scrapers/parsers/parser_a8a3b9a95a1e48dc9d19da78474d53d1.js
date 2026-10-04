$('script[type="application/ld+json"]').each(function() {
  var json = $(this).html();
  try {
    var data = JSON.parse(json);
    if (data['@graph'] && data['@graph'].length > 1 && data['@graph'][1]['@type'] === 'SearchResultsPage') {
      var itemList = data['@graph'][1].mainEntity.itemListElement;
      if (itemList && itemList.length > 0) {
        itemList.forEach(function(item) {
          var job = {};
          job.title = item.item.name;
          job.sourceUrl = item.item.url;
          result.push(job);
        });
      }
    }
  } catch (e) {}
});