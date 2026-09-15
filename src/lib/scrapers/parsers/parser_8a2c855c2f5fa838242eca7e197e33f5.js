try {
    var jobContainers = $('div.job-listing'); // assuming job listings are in divs with class 'job-listing'
    if (jobContainers.length === 0) {
        jobContainers = $('article.job'); // try another possible class
        if (jobContainers.length === 0) {
            jobContainers = $('li.job-item'); // try another possible class
            if (jobContainers.length === 0) {
                result = []; // if no job listings are found, return an empty array
                return;
            }
        }
    }

    jobContainers.each(function() {
        var job = {};
        job.title = $(this).find('h2.job-title').text().trim() || $(this).find('h1.job-title').text().trim();
        job.companyName = $(this).find('span.company-name').text().trim() || $(this).find('div.company').text().trim();
        job.description = $(this).find('div.job-description').text().trim() || $(this).find('p.job-summary').text().trim();
        job.location = $(this).find('span.location').text().trim() || $(this).find('div.job-location').text().trim();