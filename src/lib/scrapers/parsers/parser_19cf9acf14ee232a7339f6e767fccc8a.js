const $jobs = $('.job, .job-listing, .job-card, article, li.job, div.job');
$jobs.each((_, el) => {
    const $el = $(el);
    let title = $el.find('h2, h3, h4, .title, .job-title').first().text().trim();
    if (!title) return;
    let companyName = $el.find('.company, .company-name, .org, .employer').first().text().trim();
    let description = $el.find('.description, .desc, p').first().text().trim();
    let location = $el.find('.location, .loc, .city, .place').first().text().trim();
    let jobType = 'unknown';
    let typeText = $el.find('.job-type, .type, .category').first().text().trim().toLowerCase();
    if (/full time/.test(typeText)) jobType = 'full_time';
    else if (/part time/.test(typeText)) jobType = 'part_time';
    else if (/contract/.test(typeText)) jobType = 'contract';
    else if (/internship/.test(typeText)) jobType = 'internship';
    else if (/remote/.test(typeText)) jobType = 'remote';
    let postedDateIsoString = '';
    let dateText = $el.find('.date, .posted, time').first().text().trim();
    if (dateText) {
        let d = new Date(dateText);
        if (!isNaN(d)) postedDateIsoString = d.toISOString();
    }
    let deadlineIsoString = '';
    let deadlineText = $el.find('.deadline, .due, .end').first().text().trim();
    if (deadlineText) {
        let d = new Date(deadlineText);
        if (!isNaN(d)) deadlineIsoString = d.toISOString();
    }
    let salaryMin = null, salaryMax = null, salaryCurrency = '';
    let salaryText = $el.find('.salary, .pay, .compensation').first().text().trim();
    if (salaryText) {
        let m = salaryText.match(/([\d.,]+)\s*[-–]\s*([\d.,]+)\s*([A-Za-z]+)/);
        if (m) {
            salaryMin = parseFloat(m[1].replace(/,/g, ''));
            salaryMax = parseFloat(m[2].replace(/,/g, ''));
            salaryCurrency = m[3];
        } else {
            m = salaryText.match(/([\d.,]+)\s*(?:–|-)\s*.*/);
            if (m) salaryMin = parseFloat(m[1].replace(/,/g, ''));
            m = salaryText.match(/([\d.,]+)\s*(?:to|–|–)\s*.*/);
            if (m) salaryMax = parseFloat(m[1].replace(/,/g, ''));
        }
    }
    let sourceUrl = $el.find('a').attr('href');
    if (!sourceUrl) sourceUrl = '';
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