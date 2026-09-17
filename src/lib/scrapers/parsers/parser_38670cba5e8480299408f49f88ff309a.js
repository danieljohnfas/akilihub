$('article.post, div.post, div.job-item, div.job-listing, div.vacancy-item, div.job-card, article.job').each(function() {
    const $job = $(this);
    const title = $job.find('h2, h3, .job-title, .title').first().text().trim();
    if (title && title.length > 0) {
        const companyName = $job.find('.company-name, .company, .employer, .org-name').first().text().trim() || '';
        const description = $job.find('.job-description, .description, .job-desc, .post-body').first().text().trim() || '';
        const location = $job.find('.location, .job-location, .job-loc, .loc').first().text().trim() || '';
        const jobTypeText = $job.find('.job-type, .type, .employment-type').first().text().trim() || '';
        const postedDateText = $job.find('.posted-date, .date, .post-date').first().text().trim() || '';
        const deadlineText = $job.find('.deadline, .closing-date, .apply-by').first().text().trim() || '';
        const salaryText = $job.find('.salary, .pay, .compensation').first().text().trim() || '';
        const sourceUrl = $job.find('a').first().attr('href') || '';

        let jobType = '';
        const jt = jobTypeText.toLowerCase();
        if (jt.includes('full-time') || jt.includes('full time')) jobType = 'full_time';
        else if (jt.includes('part-time') || jt.includes('part time')) jobType = 'part_time';
        else if (jt.includes('contract')) jobType = 'contract';
        else if (jt.includes('intern')) jobType = 'internship';
        else if (jt.includes('remote')) jobType = 'remote';

        let salaryMin = null;
        let salaryMax = null;
        let salaryCurrency = '';
        const salaryMatch = salaryText.match(/[\d,]+/g);
        if (salaryMatch && salaryMatch.length > 0) {
            salaryMin = parseInt(salaryMatch[0].replace(/,/g, ''));
            if (salaryMatch.length > 1) salaryMax = parseInt(salaryMatch[1].replace(/,/g, ''));
            if (salaryText.match(/TZS|Tanzanian Shilling/i)) salaryCurrency = 'TZS';
            else if (salaryText.match(/USD|\$/i)) salaryCurrency = 'USD';
        }

        let postedDateIsoString = '';
        if (postedDateText) {
            const d = new Date(postedDateText);
            if (!isNaN(d.getTime())) postedDateIsoString = d.toISOString();
        }

        let deadlineIsoString = '';
        if (deadlineText) {
            const d = new Date(deadlineText);
            if (!isNaN(d.getTime())) deadlineIsoString = d.toISOString();
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
    }
});