$('article').each((index, element) => {
    const jobTitle = $(element).find('h2.entry-title a').text().trim();
    const companyName = $(element).find('.entry-meta .entry-author a').text().trim();
    const jobDescription = $(element).find('.entry-content').text().trim();
    const location = $(element).find('.job-location').text().trim();
    const jobType = $(element).find('.job-type').text().toLowerCase().trim().replace(/ /g, '_');
    const sourceUrl = $(element).find('h2.entry-title a').attr('href');
    const postedDateIsoString = $(element).find('.posted-on time').attr('datetime');
    const deadlineIsoString = $(element).find('.expiry-time time').attr('datetime');
    const salaryText = $(element).find('.salary').text().trim();
    const salary = salaryText.match(/(\d+)-(\d+)\s+(\w+)/);

    const job = {
        title: jobTitle,
        companyName: companyName,
        description: jobDescription,
        location: location,
        jobType: jobType,
        sourceUrl: sourceUrl,
        postedDateIsoString: postedDateIsoString,
        deadlineIsoString: deadlineIsoString,
        salaryMin: salary ? parseInt(salary[1]) : null,
        salaryMax: salary ? parseInt(salary[2]) : null,
        salaryCurrency: salary ? salary[3] : null
    };

    result.push(job);
});