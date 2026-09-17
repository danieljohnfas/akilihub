const jobContainers = $('article.job, .job-listing, .careers-list .post, .job-post, [class*="job"] .post, [class*="career"] .post, .careers article, .job-archive .post, .listing-item').toArray();
if (jobContainers.length === 0) {
    const fallbackContainers = $('.entry, .wp-post, .post-body, .content article, .careers-content article').toArray();
    if (fallbackContainers.length === 0) {
        // No job listing containers found; leave result empty
    } else {
        fallbackContainers.forEach((el) => {
            const $el = $(el);
            const titleEl = $el.find('h2, h3, h1').first();
            const title = titleEl.text().trim();
            if (!title || title.length < 3) return;
            const companyName = $el.find('.company, .employer, .job-company, [class*="company"]').first().text().trim() || 'MTN Ghana';
            const description = $el.find('.description, .job-description, .entry-content, .excerpt').first().text().trim() || '';
            const location = $el.find('.location, .job-location, .job-location, [class*="location"]').first().text().trim() || '';
            const jobType = $el.find('.job-type, .type, .employment-type').first().text().trim() || '';
            const sourceUrl = $el.find('a').first().attr('href') || window.location.href;
            const postedDateIsoString = $el.find('.posted-date, .date, .posted-on time').first().attr('datetime') || '';
            const deadlineIsoString = $el.find('.deadline, .apply-by, .closing-date time').first().attr('datetime') || '';
            const salaryText = $el.find('.salary, .job-salary').first().text().trim();
            const salaryMatch = salaryText.match(/(\d[\d,.]*)\s*(?:-|to)\s*(\d[\d,.]*)/);
            const salaryMin = salaryMatch ? parseFloat(salaryMatch[1].replace(/[,]/g, '')) : undefined;
            const salaryMax = salaryMatch ? parseFloat(salaryMatch[2].replace(/[,]/g, '')) : undefined;
            const salaryCurrency = salaryText.match(/(GH₵|GHS|USD|\$|₵)/i) ? (salaryText.match(/(GH₵|GHS|USD|\$|₵)/i)[0].replace('₵', 'GHS').replace('$', 'USD') || undefined) : undefined;
            result.push({ title, companyName, description, location, jobType, sourceUrl, postedDateIsoString, deadlineIsoString, salaryMin, salaryMax, salaryCurrency });
        });
    }
} else {
    jobContainers.forEach((el) => {
        const $el = $(el);
        const title = $el.find('h2, h3, h1').first().text().trim();
        if (!title || title.length < 3) return;
        const companyName = $el.find('.company, .employer, .job-company, [class*="company"]').first().text().trim() || 'MTN Ghana';
        const description = $el.find('.description, .job-description, .entry-content, .excerpt').first().text().trim() || '';
        const location = $el.find('.location, .job-location, [class*="location"]').first().text().trim() || '';
        const jobType = $el.find('.job-type, .type, .employment-type').first().text().trim().toLowerCase() || '';
        const sourceUrl = $el.find('a').first().attr('href') || window.location.href;
        const postedDateIsoString = $el.find('.posted-date, .date, .posted-on time').first().attr('datetime') || '';
        const deadlineIsoString = $el.find('.deadline, .apply-by, .closing-date time').first().attr('datetime') || '';
        const salaryText = $el.find('.salary, .job-salary').first().text().trim();
        const salaryMatch = salaryText.match(/(\d[\d,.]*)\s*(?:-|to)\s*(\d[\d,.]*)/);
        const salaryMin = salaryMatch ? parseFloat(salaryMatch[1].replace(/[,]/g, '')) : undefined;
        const salaryMax = salaryMatch ? parseFloat(salaryMatch[2].replace(/[,]/g, '')) : undefined;
        const salaryCurrency = salaryText.match(/(GH₵|GHS|USD|\$|₵)/i) ? (salaryText.match(/(GH₵|GHS|USD|\$|₵)/i)[0].replace('₵', 'GHS').replace('$', 'USD') || undefined) : undefined;
        result.push({ title, companyName, description, location, jobType, sourceUrl, postedDateIsoString, deadlineIsoString, salaryMin, salaryMax, salaryCurrency });
    });
}