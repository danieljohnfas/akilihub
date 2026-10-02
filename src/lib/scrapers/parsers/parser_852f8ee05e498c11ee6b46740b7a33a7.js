const jobContainers = $('div.jobListing');

jobContainers.each((index, element) => {
    const jobTitle = $(element).find('h2.jobTitle').text().trim();
    const companyName = $(element).find('div.companyName').text().trim();
    const description = $(element).find('div.jobDescription').text().trim();
    const location = $(element).find('div.location').text().trim();
    const jobTypeText = $(element).find('div.jobType').text().trim().toLowerCase();
    const jobType = jobTypeText.includes('full time') ? 'full_time' : jobTypeText.includes('part time') ? 'part_time' : jobTypeText.includes('contract') ? 'contract' : jobTypeText.includes('internship') ? 'internship' : jobTypeText.includes('remote') ? 'remote' : '';
    const sourceUrl = $(element).find('a.jobLink').attr('href');
    const postedDateIsoString = $(element).find('div.postedDate').text().trim();
    const deadlineIsoString = $(element).find('div.deadline').text().trim();
    const salaryText = $(element).find('div.salary').text().trim();
    const salaryParts = salaryText.split(' - ');
    const salaryMin = salaryParts.length > 0 ? parseInt(salaryParts[0].replace(/[^0-9]/g, '')) : null;
    const salaryMax = salaryParts.length > 1 ? parseInt(salaryParts[1].replace(/[^0-9]/g, '')) : null;
    const salaryCurrency = salaryText.match(/[A-Z]{3}/) ? salaryText.match(/[A-Z]{3}/)[0] : '';

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