var jobContainers = $('article');
if (jobContainers.length === 0) {
  var jobContainers = $('div.entry-content');
  if (jobContainers.length === 0) {
    result = [];
    return;
  }
}
jobContainers.each(function() {
  var title = $(this).find('h1').text().trim();
  if (!title) return;
  var job = {
    title: title,
    sourceUrl: 'https://www.ajirazote.co.tz' + window.location.pathname
  };
  var companyName = $(this).find('strong').text().trim();
  if (companyName) job.companyName = companyName;
  var description = $(this).find('p').text().trim();
  if (description) job.description = description;
  result.push(job);
});