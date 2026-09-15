var jobTitle = $('title').text();
var companyName = jobTitle.match(/at (.+) –/)[1];
var sourceUrl = $('link[rel="canonical"]').attr('href');
var jobType = 'full_time';
var description = $.root().find('div').filter(function() {
    return $(this).text().trim() !== '';
}).first().text().trim();
var location = '';
var postedDateIsoString = '';
var deadlineIsoString = '';
var salaryMin = 0;
var salaryMax = 0;
var salaryCurrency = '';
var resultObject = {
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
result.push(resultObject);