var jobContainers = $('div.post-body');
if (jobContainers.length > 0) {
  jobContainers.each(function() {
    var jobTitle = $(this).find('h2').text().trim();
    if (jobTitle) {
      var job = {
        title: jobTitle,
        companyName: '',
        description: $(this).find('p').text().trim(),
        location: '',
        jobType: '',
        sourceUrl: 'https://www.ajiraleo.com' + $('link[rel="canonical"]').attr('href'),
        postedDateIsoString: '',
        deadlineIsoString: '',
        salaryMin: 0,
        salaryMax: 0,
        salaryCurrency: ''
      };
      result.push(job);
    }
  });
}