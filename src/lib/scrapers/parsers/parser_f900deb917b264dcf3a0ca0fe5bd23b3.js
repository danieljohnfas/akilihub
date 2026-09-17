// The provided HTML does not contain actual job postings - it only shows the head/metadata section
// of a WordPress careers page for Dangote Industries Limited.
// Per instructions, leave result empty when no real job listings are present.

$('body').find('.job-listing, .job-post, .careers-list .post, .job-item, .listing-item, .wp-job-manager-job-listings .job_listing, .job_boxes li, [class*="job"]').each(function() {
    var el = $(this);
    var title = el.find('.job-title, h2, h3, .title').first().text().trim();
    if (!title) return;
    result.push({
        title: title,
        companyName: el.find('.company-name, .company, .employer').first().text().trim() || '',
        description: el.find('.description, .job-description, .content').first().text().trim() || '',
        location: el.find('.location, .job-location, .place').first().text().trim() || '',
        jobType: el.find('.job-type, .type, .employment-type').first().text().trim() || '',
        sourceUrl: el.find('a').first().attr('href') || '',
        postedDateIsoString: el.find('.posted-date, .date, .published').first().attr('datetime') || el.find('.posted-date, .date').first().text().trim() || '',
        deadlineIsoString: el.find('.deadline, .closing-date').first().attr('datetime') || el.find('.deadline, .closing-date').first().text().trim() || '',
        salaryMin: parseFloat(el.find('.salary-min, .min-salary').first().text().trim()) || undefined,
        salaryMax: parseFloat(el.find('.salary-max, .max-salary').first().text().trim()) || undefined,
        salaryCurrency: el.find('.salary-currency, .currency').first().text().trim() || ''
    });
});

// No job containers found in the provided HTML - result remains empty.