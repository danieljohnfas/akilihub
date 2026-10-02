const jobContainers = $('.job-listing');

if (jobContainers.length === 0) {
  // No job listings found, leave result array empty
} else {
  jobContainers.each((index, container) => {
    const $container = $(container);
    const job = {
      title: $container.find('.job-title').text().trim(),
      companyName: $container.find('.company-name').text().trim(),
      description: $container.find('.job-description').text().trim(),
      location: $container.find('.job-location').text().trim(),
      jobType: $container.find('.job-type').text().trim().toLowerCase().replace(/ /g, '_'),
      sourceUrl: $container.find('.job-link').attr('href'),
      postedDateIsoString: $container.find('.posted-date').attr('data-iso-date'),
      deadlineIsoString: $container.find('.deadline-date').attr('data-iso-date'),
      salaryMin: parseInt($container.find('.salary-range').text().trim().match(/\d+/g)[0], 10),
      salaryMax: parseInt($container.find('.salary-range').text().trim().match(/\d+/g)[1], 10),
      salaryCurrency: $container.find('.salary-currency').text().trim(),
    };
    result.push(job);
  });
}