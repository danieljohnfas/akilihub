try {
    let jobTitle = $('meta[property="og:title"]').attr('content');
    let companyName = jobTitle.match(/at (.*)/);
    if (companyName) companyName = companyName[1];
    else companyName = '';

    let description = $('meta[property="og:description"]').attr('content');
    let location = '';
    let jobType = '';
    let sourceUrl = $('meta[property="og:url"]').attr('content');
    let postedDateIsoString = $('meta[property="article:published_time"]').attr('content');
    let deadlineIsoString = '';
    let salaryMin = '';
    let salaryMax = '';
    let salaryCurrency = '';

    let job = {
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
} catch (e) {
    console.log('Error occurred: ' + e);
}