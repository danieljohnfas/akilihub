const jobContainers = $('.archive-item, .post, article, .job-listing');

jobContainers.each((i, el) => {
    const titleEl = $(el).find('h1, h2, h3, .title, .entry-title, a').first();
    const title = titleEl.text().trim();
    
    if (title && title.length > 2) {
        const linkEl = titleEl.is('a') ? titleEl : $(el).find('a').first();
        const sourceUrl = linkEl.attr('href') || '';
        
        const companyName = 'MTN Zambia';
        const description = $(el).text().trim().substring(0, 300);
        const location = '';
        const jobType = '';
        const postedDateIsoString = '';
        const deadlineIsoString = '';
        const salaryMin = null;
        const salaryMax = null;
        const salaryCurrency = '';

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