$('.job-title, .title, h2, h3').each(function() {
    const $el = $(this);
    const title = $el.text().trim();
    if (!title) return;
    const $container = $el.closest('.job-listing, .job, .card, .list-item, div');
    const companyName = $container.find('.company-name, .company, .org').first().text().trim();
    const description = $container.find('.description, .details, .summary').first().text().trim();
    const location = $container.find('.location, .place, .city').first().text().trim();
    const jobTypeStr = $container.find('.job-type, .type, .category').first().text().trim().toLowerCase();
    let jobType = '';
    if (jobTypeStr === 'full-time' || jobTypeStr === 'full time') jobType = 'full_time';
    else if (jobTypeStr === 'part-time' || jobTypeStr === 'part time') jobType = 'part_time';
    else if (jobTypeStr === 'contract') jobType = 'contract';
    else if (jobTypeStr === 'internship') jobType = 'internship';
    else if (jobTypeStr === 'remote') jobType = 'remote';
    const sourceUrl = $container.find('a').attr('href') || '';
    const postedDate = $container.find('.date, .posted-date, time').first().attr('datetime') || $container.text();
    const postedDateIsoString = postedDate ? new Date(postedDate).toISOString() : '';
    const deadlineIsoString = $container.find('.deadline, .expires, time').first().attr('datetime') || '';
    const salaryMin = parseFloat($container.find('.salary-min, .min, .min-salary').first().text()) || 0;
    const salaryMax = parseFloat($container.find('.salary-max, .max, .max-salary').first().text()) || 0;
    const salaryCurrency = $container.find('.salary-currency, .currency').first().text().trim() || '';
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