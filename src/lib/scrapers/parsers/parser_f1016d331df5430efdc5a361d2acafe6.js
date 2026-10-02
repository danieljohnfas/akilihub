let jobContainers = $('.job,.job-item,.job-listing,.posting,.career-item,.vacancy,.listing-item,[data-job-id],article[data-schema="JobPosting"]');
if (jobContainers.length) {
  jobContainers.each(function () {
    let el = $(this);
    let title = el.find('h1,h2,.title,.job-title,.position').first().text().trim() || null;
    if (!title) return;
    let companyName = el.find('.company,.company-name,.employer').first().text().trim() || null;
    let description = el.find('.description,.job-description,.summary').first().text().trim() || null;
    let location = el.find('.location,.job-location,.city').first().text().trim() || null;
    let typeText = el.find('.job-type,.type').first().text().trim().toLowerCase() || '';
    let jobType = null;
    if (/full\s*time/.test(typeText)) jobType = 'full_time';
    else if (/part\s*time/.test(typeText)) jobType = 'part_time';
    else if (/contract/.test(typeText)) jobType = 'contract';
    else if (/internship/.test(typeText)) jobType = 'internship';
    else if (/remote/.test(typeText)) jobType = 'remote';
    let sourceUrl = el.find('a[href]').first().attr('href') || null;
    let postedDate = el.find('time[datetime]').first().attr('datetime') || null;
    let deadline = el.find('.deadline time[datetime]').first().attr('datetime') || null;
    let salaryText = el.find('.salary').first().text().trim();
    let salaryMin = null, salaryMax = null, salaryCurrency = null;
    if (salaryText) {
      let match = salaryText.match(/([A-Z]{3})?\s*([\d,.]+)\s*(?:-|\sto\s)\s*([A-Z]{3})?\s*([\d,.]+)/i);
      if (match) {
        salaryCurrency = match[1] || match[3] || null;
        salaryMin = parseFloat(match[2].replace(/,/g, ''));
        salaryMax = parseFloat(match[4].replace(/,/g, ''));
      }
    }
    result.push({
      title,
      companyName,
      description,
      location,
      jobType,
      sourceUrl,
      postedDateIsoString: postedDate,
      deadlineIsoString: deadline,
      salaryMin,
      salaryMax,
      salaryCurrency
    });
  });
}