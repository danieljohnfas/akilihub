const jobElements = $('[class*="job-item"], [class*="job-listing"], [class*="career-opening"], [data-automation*="job-card"]');

jobElements.each((index, element) => {
    const $el = $(element);
    const job = {};

    job.title = $el.find('.job-title, h2, h3').first().text().trim() || null;
    
    job.companyName = $el.find('.company-name').first().text().trim() || 'KCB Group'; 
    
    job.description = $el.find('.job-description, .description, p[itemprop="description"]').first().text().trim() || null;
    job.location = $el.find('.job-location, .location, [itemprop="addressLocality"]').first().text().trim() || null;
    
    let jobTypeRaw = $el.find('.job-type, .type').first().text().trim().toLowerCase();
    if (jobTypeRaw.includes('full-time')) job.jobType = 'full_time';
    else if (jobTypeRaw.includes('part-time')) job.jobType = 'part_time';
    else if (jobTypeRaw.includes('contract')) job.jobType = 'contract';
    else if (jobTypeRaw.includes('internship')) job.jobType = 'internship';
    else if (jobTypeRaw.includes('remote')) job.jobType = 'remote';
    else job.jobType = null;

    const sourceLink = $el.find('a[href*="/job"], a[href*="/careers/"], .apply-link').attr('href');
    if (sourceLink) {
        try {
            job.sourceUrl = new URL(sourceLink, 'https://ke.kcbgroup.com').href;
        } catch (e) {
            job.sourceUrl = null;
        }
    } else {
        job.sourceUrl = null;
    }

    job.postedDateIsoString = null; 
    job.deadlineIsoString = null;
    job.salaryMin = null;
    job.salaryMax = null;
    job.salaryCurrency = null;

    if (job.title) {
        result.push(job);
    }
});