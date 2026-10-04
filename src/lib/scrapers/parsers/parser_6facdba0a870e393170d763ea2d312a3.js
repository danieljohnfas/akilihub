var jobContainers = $('.job, .vacancy, .position, .career, .listing-item, .job-item, .job-post');

if (!jobContainers.length) {
    jobContainers = $('article, .content, .main, .col, .row').filter(function () {
        var txt = $(this).text();
        return /vacancy|job|position|opening|internship|career/i.test(txt);
    });
}

jobContainers.each(function () {
    var container = $(this);
    var titleElem = container.find('h1, h2, h3, h4, .title, .job-title, a').first();
    var title = titleElem.text().trim();
    if (!title) return;

    var job = { title: title };

    var company = container.find('.company, .company-name, .employer, .org-name').first().text().trim();
    if (company) job.companyName = company;

    var description = container.find('.description, .job-description, p').first().text().trim();
    if (description) job.description = description;

    var location = container.find('.location, .job-location, .city').first().text().trim();
    if (location) job.location = location;

    var typeText = container.find('.job-type, .type').first().text().toLowerCase();
    var typeMap = { full: 'full_time', part: 'part_time', contract: 'contract', intern: 'internship', remote: 'remote' };
    for (var key in typeMap) {
        if (typeText.includes(key)) {
            job.jobType = typeMap[key];
            break;
        }
    }

    var src = container.find('a[href*="apply"], a[href]').first().attr('href');
    if (src) job.sourceUrl = src;

    var postedAttr = container.find('time').first().attr('datetime');
    var postedText = postedAttr || container.find('.date, .posted-date').first().text();
    if (postedText) {
        var d = new Date(postedText);
        if (!isNaN(d.getTime())) job.postedDateIsoString = d.toISOString();
    }

    var deadlineText = container.find('.deadline, .closing-date').first().text().trim();
    if (deadlineText) {
        var d2 = new Date(deadlineText);
        if (!isNaN(d2.getTime())) job.deadlineIsoString = d2.toISOString();
    }

    var salaryText = container.find('.salary, .pay, .compensation').first().text().trim();
    if (salaryText) {
        var rangeMatch = salaryText.match(/([A-Z]{3})?\s*([\d,]+)\s*(?:-|\sto\s)?\s*([A-Z]{3})?\s*([\d,]+)/i);
        if (rangeMatch) {
            var cur = rangeMatch[1] || rangeMatch[3] || '';
            var min = parseInt(rangeMatch[2].replace(/,/g, ''), 10);
            var max = parseInt(rangeMatch[4].replace(/,/g, ''), 10);
            if (!isNaN(min)) job.salaryMin = min;
            if (!isNaN(max)) job.salaryMax = max;
            if (cur) job.salaryCurrency = cur;
        } else {
            var singleMatch = salaryText.match(/([A-Z]{3})?\s*([\d,]+)/i);
            if (singleMatch) {
                var cur2 = singleMatch[1] || '';
                var amt = parseInt(singleMatch[2].replace(/,/g, ''), 10);
                if (!isNaN(amt)) {
                    job.salaryMin = amt;
                    job.salaryMax = amt;
                }
                if (cur2) job.salaryCurrency = cur2;
            }
        }
    }

    result.push(job);
});