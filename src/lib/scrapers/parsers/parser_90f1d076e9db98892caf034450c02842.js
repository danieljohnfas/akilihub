const jobContainers = $('[data-automation-id="job-card"], .job-listing, .vacancy-item, .career-item, article.job, .job-posting, .search-result-item');

jobContainers.each((index, element) => {
    const $el = $(element);
    
    const title = $el.find('h2 a, h3 a, .job-title a, .title a, a[data-automation-id="job-title"]').first().text().trim() 
        || $el.find('h2, h3, .job-title, .title').first().text().trim();
    
    if (!title) return;

    const sourceUrl = $el.find('a[data-automation-id="job-title"], .job-title a, h2 a, h3 a').first().attr('href') 
        || $el.find('a').first().attr('href');
    
    const absoluteUrl = sourceUrl && sourceUrl.startsWith('http') ? sourceUrl 
        : sourceUrl ? new URL(sourceUrl, 'https://www.pwc.co.tz').href 
        : '';

    const companyName = 'PwC Tanzania';

    const location = $el.find('[data-automation-id="job-location"], .job-location, .location, .job-meta .location').first().text().trim()
        || $el.find('.meta li:contains("Location"), .meta li:contains("Country")').first().text().replace(/Location:|Country:/i, '').trim();

    const description = $el.find('[data-automation-id="job-description"], .job-description, .description, .summary, .excerpt').first().text().trim();

    const jobTypeText = $el.find('[data-automation-id="job-type"], .job-type, .employment-type, .job-meta .type').first().text().trim().toLowerCase();
    let jobType = 'full_time';
    if (jobTypeText.includes('part')) jobType = 'part_time';
    else if (jobTypeText.includes('contract') || jobTypeText.includes('temporary')) jobType = 'contract';
    else if (jobTypeText.includes('intern')) jobType = 'internship';
    else if (jobTypeText.includes('remote')) jobType = 'remote';

    const postedText = $el.find('[data-automation-id="posted-date"], .posted-date, .date-posted, .job-meta .date').first().text().trim();
    let postedDateIsoString = '';
    if (postedText) {
        const parsed = new Date(postedText);
        if (!isNaN(parsed.getTime())) postedDateIsoString = parsed.toISOString();
    }

    const deadlineText = $el.find('[data-automation-id="deadline"], .deadline, .closing-date, .job-meta .deadline').first().text().trim();
    let deadlineIsoString = '';
    if (deadlineText) {
        const parsed = new Date(deadlineText);
        if (!isNaN(parsed.getTime())) deadlineIsoString = parsed.toISOString();
    }

    let salaryMin, salaryMax, salaryCurrency;
    const salaryText = $el.find('[data-automation-id="salary"], .salary, .compensation, .job-meta .salary').first().text().trim();
    if (salaryText) {
        const currencyMatch = salaryText.match(/([$€£¥]|USD|EUR|GBP|KES|TZS|NGN)/i);
        salaryCurrency = currencyMatch ? currencyMatch[1].toUpperCase() : 'TZS';
        const numbers = salaryText.match(/[\d,]+(?:\.\d+)?/g);
        if (numbers && numbers.length >= 2) {
            salaryMin = parseFloat(numbers[0].replace(/,/g, ''));
            salaryMax = parseFloat(numbers[1].replace(/,/g, ''));
        } else if (numbers && numbers.length === 1) {
            salaryMin = parseFloat(numbers[0].replace(/,/g, ''));
            salaryMax = salaryMin;
        }
    }

    result.push({
        title,
        companyName,
        description,
        location,
        jobType,
        sourceUrl: absoluteUrl,
        postedDateIsoString,
        deadlineIsoString,
        salaryMin,
        salaryMax,
        salaryCurrency
    });
});