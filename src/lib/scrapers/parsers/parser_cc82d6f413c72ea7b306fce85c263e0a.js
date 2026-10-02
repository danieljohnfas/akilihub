try { 
  var jobContainers = $('article');
  if (jobContainers.length > 0) {
    jobContainers.each(function() {
      var job = {};
      job.title = $(this).find('h1').text().trim();
      if (job.title) {
        job.companyName = $(this).find('strong').first().text().trim();
        job.description = $(this).find('p').first().text().trim();
        job.sourceUrl = 'https://elimuchap.com' + $(this).find('a').first().attr('href');
        result.push(job);
      }
    });
  }
} catch (e) {
  console.log(e);
}