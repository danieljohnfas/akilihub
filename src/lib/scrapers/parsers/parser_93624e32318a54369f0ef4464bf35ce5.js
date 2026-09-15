var jobContainers = $('div.job-listing');
if (jobContainers.length === 0) {
    jobContainers = $('div.job');
    if (jobContainers.length === 0) {
        jobContainers = $('div.vacancy');
        if (jobContainers.length === 0) {
            jobContainers = $('div.listing');
            if (jobContainers.length === 0) {
                jobContainers = $('div.item');
                if (jobContainers.length === 0) {
                    result = [];
                    return;
                }
            }
        }
    }
}

jobContainers.each(function() {
    var job = {};
    var title = $(this).find('h2, h3, h4').first().text().trim();
    if (title) {
        job.title = title;
    } else {
        return;
    }

    var companyName = $(this).find('span.company, span.organization').first().text().trim();
    if (companyName) {
        job.companyName = companyName;
    }

    var description = $(this).find('div.description, div.summary').first().text().trim();
    if (description) {
        job.description = description;
    }

    var location = $(this).find('span