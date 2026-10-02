var jobContainers = $('h2, .job, .listing, .posting');
jobContainers.each(function() {
    var $container = $(this);
    var title = $container.find('h3, h4, p').text().trim();
    if (title && /\w+\s+(?:Job|Position|Role|Career|Employment)/i.test(title)) {
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
        $container.find('p, div, li').each(function() {
            var p = $(this);
            if (p.length) {
                job.description = p.text().substring(0, 300);
                break;
            }
        });
        $container.find('time, span, .date').each(function() {
            var d = $(this);
            if (d.length) {
                job.postedDateIsoString = d.attr('datetime') || d.text().substring(0, 50);
                break;
            }
        });
        result.push(job);
    }
});