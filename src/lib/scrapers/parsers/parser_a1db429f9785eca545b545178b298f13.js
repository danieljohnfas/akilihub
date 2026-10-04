try {
  const jobContainers = $('article');
  if (jobContainers.length === 0) {
    const jobListings = $('ul.job_listings li');
    if (jobListings.length > 0) {
      jobListings.each(function() {
        const job = {};
        job.title = $(this).find('h2').text().trim();
        job.companyName = $(this).find('span.company').text().trim();
        job.location = $(this).find('span.location').text().trim();
        job.jobType = $(this).find('span.job-type').text().trim();
        job.sourceUrl = $(this).find('a').attr('href');
        result.push(job);
      });
    } else {
      const paragraphs = $('p');
      paragraphs.each(function() {
        const text = $(this).text();
        if (text.includes('Vacancies') || text.includes('Job Opportunities')) {
          const job = {};
          job.title = $(this).find('strong').text().trim();
          job.companyName = $('title').text().split(' ')[0] + ' ' + $('title').text().split(' ')[1];
          job.location = text.match(/in (.*)\./)[1];