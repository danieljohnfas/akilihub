let jobContainers = $('.job, .vacancy, .search-result, .list-group-item, .panel-body .row');
jobContainers.each((i, el) => {
    let container = $(el);
    let titleElem = container.find('h2 a, h3 a, .title a, .job-title a, a.job-link').first();
    let title = titleElem.text().trim();
    if (!title) {
        title = container.find('h2, h3, .title, .job-title').first().text().trim();
    }
    if (!title) return;
    let sourceUrl = titleElem.attr('href') || '';
    if (sourceUrl && !sourceUrl.match(/^https?:\/\//i)) {
        try {
            sourceUrl = new URL(sourceUrl, 'https://uncareer.net').href;
        } catch (e) {}
    }
    let companyName = container.find('.company, .org, .agency, .company-name').first().text().trim();
    let location = container.find('.location, .job-location').first().text().trim();
    let description = container.find('.description, .summary, .job-summary').first().text().trim();
    let typeText = container.find('.type, .job-type').first().text().trim().toLowerCase();
    let jobTypeMap = {
        'full time': 'full_time',
        'full-time': 'full_time',
        'part time': 'part_time',
        'part-time': 'part_time',
        'contract': 'contract',
        'internship': 'internship',
        'intern': 'internship',
        'remote': 'remote'
    };
    let jobType = jobTypeMap[typeText] || null;
    let posted = container.find('.date, .posted, .posted-date').first().text().trim();
    let postedDateIsoString = posted ? new Date(posted).toISOString() : null;
    let deadline = container.find('.deadline, .apply-by').first().text().trim();
    let deadlineIsoString = deadline ? new Date(deadline).toISOString() : null;
    let salaryText = container.find('.salary, .pay').first().text().trim();
    let salaryMin = null;
    let salaryMax = null;
    let salaryCurrency = null;
    if (salaryText) {
        let m = salaryText.match(/([A-Za-z]{3})?\s?([\d,]+)(?:\s?[-–]\s?([\d,]+))?/);
        if (m) {
            salaryCurrency = m[1] || null;
            salaryMin = parseFloat(m[2].replace(/,/g, ''));
            if (m[3]) {
                salaryMax = parseFloat(m[3].replace(/,/g, ''));
            } else {
                salaryMax = salaryMin;
            }
        }
    }
    result.push({
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