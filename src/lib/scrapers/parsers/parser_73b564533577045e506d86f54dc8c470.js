const canonicalLink = $('link[rel="canonical"]').attr('href');
const baseUrl = canonicalLink || 'https://www.wvi.org/tanzania/careers';

const jobContainers = $('div.views-row, article.job-listing, div.job-item, div[data-job-id]');

jobContainers.each((index, element) => {
    const $job = $(element);

    let title = $job.find('h2 a, h3 a, .job-title a, .field-name-title a').first().text().trim();
    let sourceUrl = $job.find('h2 a, h3 a, .job-title a, .field-name-title a').first().attr('href');
    let description = $job.find('.job-description, .field-name-body, .field--name-body, .description').first().text().trim();
    let location = $job.find('.job-location, .field-name-location, .field--name-field-job-location, .location').first().text().trim();
    let postedDateIsoString = $job.find('time[datetime], .job-posted-date time, .field-name-post-date time, .posted-date').first().attr('datetime');
    let jobType = $job.find('.job-type, .field-name-job-type, .field--name-job-type').first().text().trim();

    if (!title) {
        title = $job.find('h2, h3, .job-title, .field-name-title').first().text().trim();
    }
    
    if (!title) {
        return; 
    }

    if (sourceUrl) {
        try {
            sourceUrl = new URL(sourceUrl, baseUrl).href;
        } catch (e) {
            sourceUrl = baseUrl; 
        }
    } else {
        sourceUrl = baseUrl;
    }

    if (jobType) {
        const lowerJobType = jobType.toLowerCase();
        if (lowerJobType.includes('full-time')) jobType = 'full_time';
        else if (lowerJobType.includes('part-time')) jobType = 'part_time';
        else if (lowerJobType.includes('contract')) jobType = 'contract';
        else if (lowerJobType.includes('internship')) jobType = 'internship';
        else if (lowerJobType.includes('remote')) jobType = 'remote';
        else jobType = null;
    } else {
        jobType = null;
    }

    const job = {
        title: title,
        companyName: 'World Vision International',
        description: description || null,
        location: location || null,
        jobType: jobType,
        sourceUrl: sourceUrl,
        postedDateIsoString: postedDateIsoString || null,
        deadlineIsoString: null,
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null,
    };

    result.push(job);
});