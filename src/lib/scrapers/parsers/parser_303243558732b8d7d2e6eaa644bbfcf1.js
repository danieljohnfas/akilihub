const jobListings = $('.post');  
if (jobListings.length > 0) {
  jobListings.each((index, element) => {
    const jobTitle = $(element).find('.entry-title').text().trim();
    const companyName = $(element).find('.company-name').text().trim();
    const description = $(element).find('.job-description').text().trim();
    const location = $(element).find('.job-location').text().trim();
    const jobType = $(element).find('.job-type').text().trim().toLowerCase().replace(/ /g, '_');
    const sourceUrl = $(element).find('.job-link').attr('href');
    const postedDateIsoString = $(element).find('.posted-date').attr('datetime');
    const deadlineIsoString = $(element).find('.deadline-date').attr('datetime');
    const salaryText = $(element).find('.salary').text().trim();
    const salaryMatch = salaryText.match(/(\d+(\.\d+)?)/g);
    const salaryMin = salaryMatch ? parseFloat(salaryMatch[0]) : null;
    const salaryMax = salaryMatch && salaryMatch.length > 1 ? parseFloat(salaryMatch[1]) : null;
    const salaryCurrency = salaryText.match(/[A-Z]{3}/) ? salaryText.match(/[A-Z]{3}/)[0] : null;

    const job = {
      title: jobTitle,
      companyName: companyName,
      description: description,
      location: location,
      jobType: jobType,
      sourceUrl: sourceUrl,
      postedDateIsoString: postedDateIsoString,
      deadlineIsoString: deadlineIsoString,
      salaryMin: salaryMin,
      salaryMax: salaryMax,
      salaryCurrency: salaryCurrency
    };

    result.push(job);
  });
} else {
  // No job listings found
}