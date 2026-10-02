$('div.job-listing').each((index, element) => {
    const jobContainer = $(element);
    const jobTitle = jobContainer.find('h2.job-title').text().trim();
    const companyName = jobContainer.find('span.company-name').text().trim();
    const description = jobContainer.find('p.job-description').text().trim();
    const location = jobContainer.find('span.job-location').text().trim();
    const jobType = jobContainer.find('span.job-type').text().trim().toLowerCase();
    const sourceUrl = jobContainer.find('a').attr('href');
    const postedDateIsoString = jobContainer.find('span.posted-date').attr('data-date');
    const deadlineIsoString = jobContainer.find('span.deadline').attr('data-date');
    const salaryInfo = jobContainer.find('span.salary').text().trim().split(' ');
    const salaryMin = parseFloat(salaryInfo[0]);
    const salaryMax = parseFloat(salaryInfo[2]);
    const salaryCurrency = salaryInfo[1];

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