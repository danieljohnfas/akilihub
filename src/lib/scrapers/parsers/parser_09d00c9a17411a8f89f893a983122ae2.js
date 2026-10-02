// Check if the HTML contains job listings
if ($('h1').text().includes('Lawyers') && $('ul').hasClass('search_results')) {
  // Loop through each job listing
  $('ul.search_results li').each((index, element) => {
    const $element = $(element);
    const title = $element.find('.job_title').text().trim();
    const companyName = $element.find('.company_name').text().trim();
    const description = $element.find('.job_description').text().trim();
    const location = $element.find('.job_location').text().trim();
    const jobType = $element.find('.job_type').text().trim().toLowerCase();
    const sourceUrl = $element.find('.job_link a').attr('href');
    const postedDateIsoString = $element.find('.posted_date').data('iso-date');
    const deadlineIsoString = $element.find('.deadline_date').data('iso-date');
    const salaryMin = $element.find('.salary_min').text().trim().replace(/[^0-9]/g, '');
    const salaryMax = $element.find('.salary_max').text().trim().replace(/[^0-9]/g, '');
    const salaryCurrency = $element.find('.salaryCurrency').text().trim();

    // Create a job object and add it to the result array
    const job = {
      title: title,
      companyName: companyName,
      description: description,
      location: location,
      jobType: jobType,
      sourceUrl: sourceUrl,
      postedDateIsoString: postedDateIsoString,
      deadlineIsoString: deadlineIsoString,
      salaryMin: salaryMin ? parseInt(salaryMin) : null,
      salaryMax: salaryMax ? parseInt(salaryMax) : null,
      salaryCurrency: salaryCurrency
    };

    result.push(job);
  });
}