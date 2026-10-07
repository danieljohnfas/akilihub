const jobContainers = $('article, div.job, .posting, li, .job-listing');
const jobs = jobContainers.filter(el => el.is('li, div, article') && el.find('h2, h3, h4, .title').length > 0);

jobs.forEach(function(job) {
    const title = job.find('h2, h3, h4, .title').first().text().trim();
    if (!title) return;

    const jobObj = {
        title: title,
        companyName: '',
        description: '',
        location: '',
        jobType: '',
        sourceUrl: '',
        postedDateIsoString: '',
        deadlineIsoString: '',
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: ''
    };

    const company = job.find('.company, .org, .name').first().text().trim();
    const desc = job.find('.description, .summary, p').eq(0) ? job.find('.description, .summary, p').first().text().trim() : '';
    const loc = job.find('.location, .city, .place').first().text().trim();
    const type = job.find('.type, .role, .employment').first().text().trim();
    const url = job.attr('href') || '';

    jobObj.companyName = company;
    jobObj.description = desc;
    jobObj.location = loc;
    jobObj.jobType = type;
    jobObj.sourceUrl = url;
    jobs.push(jobObj);
});

result.push(jobs);