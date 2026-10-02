var jobContainer = $('body.coreCSB.job-page');
if (jobContainer.length > 0) {
    var title = $('meta[property="og:title"]').attr('content');
    var description = $('meta[property="og:description"]').attr('content');
    var companyName = 'Dangote Industries Limited';
    var location = 'Mtwara Plant Tanzania';
    var sourceUrl = $('link[rel="canonical"]').attr('href');
    var jobType = 'full_time';
    var postedDateIsoString = '';
    var deadlineIsoString = '';
    var salaryMin = '';
    var salaryMax = '';
    var salaryCurrency = '';

    result.push({
        title: title,
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
    });
} else {
    result = [];
}