if ($('body').find('.job-listing').length > 0) {
  $('.job-listing').each((index, element) => {
    const title = $(element).find('.job-title').text().trim();
    const companyName = $(element).find('.company-name').text().trim();
    const description = $(element).find('.job-description').text().trim();
    const location = $(element).find('.job-location').text().trim();
    const jobType = $(element).find('.job-type').text().trim().toLowerCase();
    const sourceUrl = $(element).find('.job-link').attr('href');
    const postedDateIsoString = $(element).find('.posted-date').text().trim();
    const deadlineIsoString = $(element).find('.deadline').text().trim();
    const salaryMinText = $(element).find('.salary-min').text().trim();
    const salaryMaxText = $(element).find('.salary-max').text().trim();
    const salaryCurrency = $(element).find('.salary-currency').text().trim();

    const salaryMin = salaryMinText ? parseFloat(salaryMinText.replace(/[^\d.-]/g, '')) : null;
    const salaryMax = salaryMaxText ? parseFloat(salaryMaxText.replace(/[^\d.-]/g, '')) : null;

    result.push({
      title,
      companyName,
      description,
      location,
      jobType,
      sourceUrl,
      postedDateIsoString,
      deadlineIsoString,
      salaryMin,
      salaryMax,
      salaryCurrency
    });
  });
} else {
  result = [];
}