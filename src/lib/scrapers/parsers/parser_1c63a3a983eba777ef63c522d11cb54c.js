let jobTitle = $('meta[property="og:title"]').attr('content');
let companyName = $('meta[property="article:author"]').attr('content');
let description = $('meta[property="og:description"]').attr('content');
let location = '';
let jobType = '';
let sourceUrl = $('meta[property="og:url"]').attr('content');
let postedDateIsoString = $('meta[property="article:published_time"]').attr('content');
let deadlineIsoString = '';
let salaryMin = 0;
let salaryMax = 0;
let salaryCurrency = '';

if (jobTitle && companyName && description && sourceUrl && postedDateIsoString) {
    result.push({
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
    });
}