const jobSelectors = ['h2', 'article', 'li.job', '.job-listing', 'div[data-job]'];
jobSelectors.forEach(selector => {
    const jobs = $(selector);
    if (jobs.length === 0) return;
    jobs.each(function() {
        const $job = $(this);
        const title = $job.find('h3, h2, .title').text().trim();
        if (!title) return false;

        const obj = {
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

        const comp = $job.find('.company, .org, [data-company]');
        if (comp.length) obj.companyName = comp.text().trim();

        const desc = $job.find('.description, .summary, p');
        if (desc.length) obj.description = desc.text().trim();

        const loc = $job.find('.location, .city, .position');
        if (loc.length) obj.location = loc.text().trim();

        const type = $job.find('.type, .role, .employment');
        if (type.length) obj.jobType = type.text().trim();

        const url = $job.attr('href');
        if (url) obj.sourceUrl = url;

        result.push(obj);
    });
});