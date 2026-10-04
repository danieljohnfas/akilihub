var jobContainers = $('article');
if (jobContainers.length === 0) {
  jobContainers = $('div.entry-content').find('p');
}
jobContainers.each(function() {
  var jobTitle = $(this).find('strong, b').text().trim();
  if (jobTitle) {
    var job = {
      title: jobTitle,
      companyName: 'UDOM',
      sourceUrl: 'https://ajirachap.com/2026/09/18/udom-job-vacancies-15-positions-september-2026/',
      postedDateIsoString: '2026-09-18T03:47:28+00:00',
      description: $(this).text().trim()
    };
    result.push(job);
  }
});