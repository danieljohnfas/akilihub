if ($('body').is(':contains("Job Title")') || $('body').is(':contains("job title")')) {
  $('div.job-listing').each((index, element) => {
    const job = {
      title: $(element).find('h2.job-title').text().trim(),
      companyName: $(element).find('div.company-name').text().trim(),
      description: $(element).find('div.job-description').text().trim(),
      location: $(element).find('div.job-location').text().trim(),
      jobType: $(element).find('div.job-type').text().trim().toLowerCase().replace(/\s+/g, '_'),
      sourceUrl: $(element).find('a.job-link').attr('href'),
      postedDateIsoString: $(element).find('div.posted-date').attr('data-date'),
      deadlineIsoString: $(element).find('div.deadline').attr('data-date'),
      salaryMin: parseInt($(element).find('div.salary-range').attr('data-salary-min'), 10),
      salaryMax: parseInt($(element).find('div.salary-range').attr('data-salary-max'), 10),
      salaryCurrency: $(element).find('div.salary-currency').text().trim()
    };
    result.push(job);
  });
}