var jobContainers = $('div.job-listing, li.job-item, .job-card, article.post');
jobContainers.each(function() {
    var $job = $(this);
    var title = $job.find('.title, h2, h3, p:first-of-type').text().trim();
    if (title) {
        var job = {
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
        result.push(job);
    }
});