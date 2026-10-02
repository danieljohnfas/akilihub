result = [];

$('.job-item').each((index, element) => {
    const job = {};
    const $job = $(element);

    const titleElement = $job.find('.job-item-title');
    const title = titleElement.text().trim();

    if (!title) {
        return;
    }

    job.title = title;

    job.companyName = null;

    job.description = $job.find('.job-item-description span').text().trim() || null;

    job.location = $job.find('.job-item-location span').text().trim() || null;

    const jobTypeText = $job.find('.job-item-sub-title').text().trim();
    if (jobTypeText) {
        switch (jobTypeText.toLowerCase()) {
            case 'full time':
                job.jobType = 'full_time';
                break;
            case 'part time':
                job.jobType = 'part_time';
                break;
            case 'contract':
                job.jobType = 'contract';
                break;
            case 'internship':
                job.jobType = 'internship';
                break;
            case 'remote':
                job.jobType = 'remote';
                break;
            default:
                job.jobType = null;
        }
    } else {
        job.jobType = null;
    }

    const sourceHref = titleElement.attr('href');
    if (sourceHref) {
        job.sourceUrl = sourceHref;
    } else {
        job.sourceUrl = null;
    }

    const postedDateText = $job.find('.job-item-date span').text().trim();
    if (postedDateText && postedDateText.startsWith('Posted:')) {
        const datePart = postedDateText.replace('Posted:', '').trim();
        try {
            const date = new Date(datePart);
            if (!isNaN(date.getTime())) {
                job.postedDateIsoString = date.toISOString();
            } else {
                job.postedDateIsoString = null;
            }
        } catch (e) {
            job.postedDateIsoString = null;
        }
    } else {
        job.postedDateIsoString = null;
    }

    job.deadlineIsoString = null;
    job.salaryMin = null;
    job.salaryMax = null;
    job.salaryCurrency = null;

    result.push(job);
});