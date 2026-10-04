var jobContainers = $('.job, .position, .vacancy, .job-listing, .listing');
jobContainers.each(function() {
  var el = $(this);
  var title = el.find('h1, h2, h3, h4, h5, h6').text().trim();
  if (!title) return false;
  
  var company = el.find('.company, .org, .name, [data-company], [data-org]).text().trim();
  var description = el.find('p').text().trim();
  var sourceUrl = el.find('a').attr('href') || '';
  
  var jobObj = {
    title: title,
    companyName: company,
    description: description,
    location: '',
    jobType: '',
    sourceUrl: sourceUrl,
    postedDateIsoString: '',
    deadlineIsoString: '',
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: ''
  };
  
  // Attempt to extract salary if present in text or attributes
  if (description.includes('Salary') || description.includes('pay')) {
    var salMatch = description.match(/(\d+(?:[\s\-.]+\d+)?)\s*(?:USD|EUR|GBP|JPY|CAD|AUD)/i);
    if (salMatch) {
      var parts = salMatch[0].split(/[,\s]+/);
      if (parts.length >= 2) {
        jobObj.salaryMin = parseFloat(parts[0]);
        jobObj.salaryMax = parseFloat(parts[1]);
        jobObj.salaryCurrency = parts[0].match(/([A-Z]{3})/i)[1];
      }
    }
  }
  
  result.push(jobObj);
});

// If no jobs were found, result remains empty as required.