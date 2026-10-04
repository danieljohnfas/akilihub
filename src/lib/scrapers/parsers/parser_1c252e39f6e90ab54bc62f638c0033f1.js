let jobContainers = $('.job-listing, .job-item, .career-item, .vacancy, .jobs .job, .listing .job, .position'); 
if (jobContainers.length) { 
  jobContainers.each(function () { 
    let el = $(this); 
    let title = el.find('h1, h2, h3, .job-title, .title, a.title').first().text().trim(); 
    if (!title) return; 
    let companyName = el.find('.company, .company-name, .employer').first().text().trim(); 
    let description = el.find('.description, .job-description, p').first().text().trim(); 
    let location = el.find('.location, .job-location').first().text().trim(); 
    let jobTypeText = el.find('.job-type, .type').first().text().toLowerCase(); 
    let jobTypeMap = { 'full time': 'full_time', 'full-time': 'full_time', 'part time': 'part_time', 'part-time': 'part_time', 'contract': 'contract', 'internship': 'internship', 'intern': 'internship', 'remote': 'remote' }; 
    let jobType = Object.keys(jobTypeMap).find(k => jobTypeText.includes(k)); 
    if (jobType) jobType = jobTypeMap[jobType]; 
    let sourceUrl = el.find('a').first().attr('href') || ''; 
    let posted = el.find('.posted-date, .date-posted, time').first().attr('datetime') || el.find('.posted-date, .date-posted, time').first().text(); 
    let postedDateIsoString = posted ? new Date(posted).toISOString() : ''; 
    let deadline = el.find('.deadline, .apply-by').first().attr('datetime') || el.find('.deadline, .apply-by').first().text(); 
    let deadlineIsoString = deadline ? new Date(deadline).toISOString() : ''; 
    let salaryText = el.find('.salary, .pay, .compensation').first().text(); 
    let salaryMin = null, salaryMax = null, salaryCurrency = null; 
    if (salaryText) { 
      let match = salaryText.replace(/,/g, '').match(/([A-Za-z$€£]+)?\\s*(\\d+(?:\\.\\d+)?)(?:\\s*-\\s*(\\d+(?:\\.\\d+)?))?/); 
      if (match) { 
        salaryCurrency = match[1] ? match[1].trim() : null; 
        salaryMin = parseFloat(match[2]); 
        if (match[3]) salaryMax = parseFloat(match[3]); else salaryMax = salaryMin; 
      } 
    } 
    let job = { 
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
    }; 
    result.push(job); 
  }); 
}