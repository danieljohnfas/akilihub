const jobContainers = $('.job-listing, .job-item, .career-entry, article.job, div.job-card, [itemtype="http://schema.org/JobPosting"]');

jobContainers.each((index, element) => {
    const $job = $(element);
    const job = {};

    job.title = $job.find('h2, h3, .job-title, [itemprop="title"], [itemprop="name"]').first().text().trim();

    if (job.title) {
        job.companyName = $job.find('.company-name, [itemprop="hiringOrganization"] [itemprop="name"]').first().text().trim();
        job.description = $job.find('.job-description, .description, [itemprop="description"]').first().text().trim();
        job.location = $job.find('.job-location, .location, [itemprop="jobLocation"] [itemprop="addressLocality"], [itemprop="addressRegion"]').first().text().trim();
        
        let jobTypeRaw = $job.find('.job-type, .employment-type, [itemprop="employmentType"]').first().text().toLowerCase().trim();
        if (jobTypeRaw.includes('full_time') || jobTypeRaw.includes('full-time')) { job.jobType = 'full_time'; }
        else if (jobTypeRaw.includes('part_time') || jobTypeRaw.includes('part-time')) { job.jobType = 'part_time'; }
        else if (jobTypeRaw.includes('contract')) { job.jobType = 'contract'; }
        else if (jobTypeRaw.includes('internship')) { job.jobType = 'internship'; }
        else if (jobTypeRaw.includes('remote')) { job.jobType = 'remote'; }
        else { job.jobType = ''; }

        job.sourceUrl = $job.find('a[href*="apply"], .apply-button a, a.btn-apply').attr('href');
        if (!job.sourceUrl) {
            job.sourceUrl = $job.find('a[rel="bookmark"]').attr('href');
        }
        
        job.postedDateIsoString = $job.find('.date-posted, [itemprop="datePosted"]').attr('datetime') || $job.find('.date-posted, [itemprop="datePosted"]').text().trim();
        job.deadlineIsoString = $job.find('.deadline-date, [itemprop="validThrough"]').attr('datetime') || $job.find('.deadline-date, [itemprop="validThrough"]').text().trim();

        const salaryText = $job.find('.salary, [itemprop="baseSalary"]').text().trim();
        if (salaryText) {
            const matches = salaryText.match(/(\$?€?£?)([0-9,.]+)(?:[\s-]*)(?:to)?(?:[\s-]*)(?:(\$?€?£?)([0-9,.]+))?/i);
            if (matches) {
                job.salaryMin = parseFloat(matches[2].replace(/[^0-9.]/g, ''));
                if (matches[4]) {
                    job.salaryMax = parseFloat(matches[4].replace(/[^0-9.]/g, ''));
                }
                job.salaryCurrency = matches[1] || matches[3] || '';
                if (!job.salaryCurrency) {
                    const currencyMatch = salaryText.match(/(usd|eur|gbp|tsh|tzs)\b/i);
                    if (currencyMatch) {
                        job.salaryCurrency = currencyMatch[1].toUpperCase();
                    }
                }
            }
        }
        
        result.push(job);
    }
});

$('script[type="application/ld+json"]').each((i, el) => {
    try {
        const schemaText = $(el).text();
        const schema = JSON.parse(schemaText);
        
        const extractFromJsonLd = (data) => {
            if (Array.isArray(data)) {
                data.forEach(item => extractFromJsonLd(item));
            } else if (typeof data === 'object' && data !== null) {
                if (data['@type'] === 'JobPosting' || (Array.isArray(data['@type']) && data['@type'].includes('JobPosting'))) {
                    const job = {};
                    job.title = data.title || data.name || '';
                    if (!job.title) return;

                    job.companyName = data.hiringOrganization?.name || '';
                    job.description = data.description || '';
                    
                    if (data.jobLocation) {
                        if (typeof data.jobLocation === 'string') {
                            job.location = data.jobLocation;
                        } else if (data.jobLocation.address) {
                            job.location = data.jobLocation.address.addressLocality || data.jobLocation.address.addressRegion || data.jobLocation.address.streetAddress || '';
                        }
                    }
                    
                    let jobTypeRaw = data.employmentType?.toLowerCase() || '';
                    if (jobTypeRaw.includes('full_time') || jobTypeRaw.includes('full-time')) { job.jobType = 'full_time'; }
                    else if (jobTypeRaw.includes('part_time') || jobTypeRaw.includes('part-time')) { job.jobType = 'part_time'; }
                    else if (jobTypeRaw.includes('contract')) { job.jobType = 'contract'; }
                    else if (jobTypeRaw.includes('internship')) { job.jobType = 'internship'; }
                    else if (jobTypeRaw.includes('remote')) { job.jobType = 'remote'; }
                    else { job.jobType = ''; }

                    job.sourceUrl = data.url || '';
                    job.postedDateIsoString = data.datePosted || '';
                    job.deadlineIsoString = data.validThrough || '';

                    if (data.baseSalary) {
                        if (typeof data.baseSalary.value === 'object' && data.baseSalary.value !== null) {
                            job.salaryMin = data.baseSalary.value.minValue || null;
                            job.salaryMax = data.baseSalary.value.maxValue || null;
                            job.salaryCurrency = data.baseSalary.value.currency || '';
                        } else if (typeof data.baseSalary === 'object' && data.baseSalary !== null) {
                            job.salaryCurrency = data.baseSalary.currency || '';
                        }
                    }

                    if (!result.some(existingJob => existingJob.title === job.title && existingJob.companyName === job.companyName && existingJob.sourceUrl === job.sourceUrl)) {
                        result.push(job);
                    }
                }
                if (data['@graph']) {
                    extractFromJsonLd(data['@graph']);
                }
                for (const key in data) {
                    if (Object.prototype.hasOwnProperty.call(data, key) && key !== '@graph' && key !== '@context' && key !== '@id') {
                        extractFromJsonLd(data[key]);
                    }
                }
            }
        };
        extractFromJsonLd(schema);
    } catch (e) {
        // JSON parsing error, silently ignored as per instructions (no comments, no console output).
    }
});