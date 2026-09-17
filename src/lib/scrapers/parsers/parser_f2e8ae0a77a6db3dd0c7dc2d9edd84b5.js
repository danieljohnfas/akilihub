const jobContainers = $('[class*="job"], [class*="vacancy"], [class*="career"], [id*="job"], [id*="vacancy"], [id*="career"], article, .listing-item, .job-item, .vacancy-item').filter((i, el) => {
    const text = $(el).text().toLowerCase();
    return text.includes('apply') || text.includes('position') || text.includes('role') || $(el).find('h1, h2, h3, h4, .title, .job-title').length > 0;
});

if (jobContainers.length === 0) {
    const bodyText = $('body').text().toLowerCase();
    const hasJobKeywords = bodyText.includes('job') || bodyText.includes('vacancy') || bodyText.includes('career') || bodyText.includes('position');
    if (!hasJobKeywords) {
        // No job content detected, result stays empty
    }
}

jobContainers.each((index, element) => {
    const $el = $(element);
    const title = $el.find('h1, h2, h3, h4, .job-title, .title, [class*="title"]').first().text().trim();
    if (!title) return;

    const companyName = 'Kilombero Sugar Company';
    const description = $el.find('.description, .content, .details, p').text().trim();
    const location = $el.find('[class*="location"], [class*="place"], .location').text().trim() || 'Tanzania';
    const sourceUrl = $el.find('a[href*="job"], a[href*="vacancy"], a[href*="career"], a[href*="apply"]').attr('href') || $el.find('a').first().attr('href') || '';
    const postedDate = $el.find('[class*="date"], [class*="posted"], time').attr('datetime') || $el.find('[class*="date"], [class*="posted"], time').text().trim();
    const deadline = $el.find('[class*="deadline"], [class*="close"], [class*="expiry"]').text().trim();

    let salaryMin = null, salaryMax = null, salaryCurrency = null;
    const salaryText = $el.find('[class*="salary"], [class*="compensation"], [class*="pay"]').text().trim();
    if (salaryText) {
        const matches = salaryText.match(/(\d[\d,.]*)\s*[-–]\s*(\d[\d,.]*)/);
        if (matches) {
            salaryMin = parseFloat(matches[1].replace(/,/g, ''));
            salaryMax = parseFloat(matches[2].replace(/,/g, ''));
        } else {
            const single = salaryText.match(/(\d[\d,.]*)/);
            if (single) salaryMin = salaryMax = parseFloat(single[1].replace(/,/g, ''));
        }
        if (salaryText.toLowerCase().includes('tsh') || salaryText.toLowerCase().includes('tzs')) salaryCurrency = 'TZS';
        else if (salaryText.includes('$')) salaryCurrency = 'USD';
    }

    let jobType = 'full_time';
    const typeText = ($el.find('[class*="type"], [class*="contract"]').text() + ' ' + description).toLowerCase();
    if (typeText.includes('part.time') || typeText.includes('part-time')) jobType = 'part_time';
    else if (typeText.includes('contract')) jobType = 'contract';
    else if (typeText.includes('intern')) jobType = 'internship';
    else if (typeText.includes('remote')) jobType = 'remote';

    const postedDateIsoString = postedDate ? new Date(postedDate).toISOString() : null;
    const deadlineIsoString = deadline ? new Date(deadline).toISOString() : null;

    result.push({
        title,
        companyName,
        description: description || null,
        location: location || null,
        jobType,
        sourceUrl: sourceUrl ? (sourceUrl.startsWith('http') ? sourceUrl : 'https://kilombero.co.tz' + sourceUrl) : null,
        postedDateIsoString,
        deadlineIsoString,
        salaryMin,
        salaryMax,
        salaryCurrency
    });
});