var selectors = ['.job-card', '.job-listing', '.job-item', 'article', '.career-post'];
var jobs = [];
for (var s of selectors) {
    $(s).each(function(i, el) {
        var $el = $(el);
        var title = $el.find('h2, h3, .job-title, .title').first().text().trim();
        if (!title) return;
        var companyName = $el.find('.company, .employer, .company-name').text().trim() || '';
        var location = $el.find('.location').text().trim() || '';
        var description = $el.find('.description, .summary').text().trim() || '';
        var sourceUrl = $el.find('a').attr('href') || '';
        var jobTypeText = $el.find('.job-type, .type, .employment').text().trim().toLowerCase();
        var jobTypeMap = {
            'full-time': 'full_time',
            'part-time': 'part_time',
            'contract': 'contract',
            'internship': 'internship',
            'remote': 'remote'
        };
        var jobType = jobTypeMap[jobTypeText] || '';
        var postedDateIsoString = $el.find('.posted-date, time[datetime]').attr('datetime') || '';
        var deadlineIsoString = $el.find('.deadline').attr('datetime') || '';
        var salaryText = $el.find('.salary, .pay').text().trim();
        var salaryMin = null, salaryMax = null, salaryCurrency = '';
        if (salaryText) {
            var salaryMatch = salaryText.match(/([$€£]?)\s*(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?/);
            if (salaryMatch) {
                salaryCurrency = salaryMatch[1] || '';
                salaryMin = parseFloat(salaryMatch[2]);
                if (salaryMatch[3]) salaryMax = parseFloat(salaryMatch[3]);
            }
        }
        jobs.push({
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
        });
    });
}
if (jobs.length) {
    result.push(...jobs);
}