var jobContainers = $('div.job, .job, .post, [data-job]');
jobContainers.each(function() {
    var $container = this;
    var title = $container.find('h2, h3, h4, .title').eq(0).text().trim();
    if (!title) return;
    
    var job = {
        title: title,
        companyName: '',
        description: '',
        location: '',
        jobType: 'unknown',
        sourceUrl: '',
        postedDateIsoString: '',
        deadlineIsoString: '',
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: ''
    };
    
    var company = $container.find('.company, .org, .firm');
    if (company.length) job.companyName = company.text().trim();
    
    var url = $container.find('a[href]');
    if (url.length) job.sourceUrl = url.attr('href');
    
    result.push(job);
});