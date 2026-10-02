try {
    var jobContainers = $('article');
    if (jobContainers.length === 0) {
        jobContainers = $('div.post');
    }
    if (jobContainers.length === 0) {
        jobContainers = $('div.entry-content');
    }
    if (jobContainers.length === 0) {
        jobContainers = $('div.post-content');
    }
    jobContainers.each(function () {
        var job = {};
        var title = $(this).find('h1.entry-title, h1.post-title, h2.entry-title, h2.post-title');
        if (title.length > 0) {
            job.title = title.text().trim();
            var companyName = $(this).find('span.author, span.post-author');
            if (companyName.length > 0) {
                job.companyName = companyName.text().trim();
            }
            var description = $(this).find('div.entry-content, div.post-content');
            if (description.length > 0) {
                job.description = description.text().trim();
            }
            var location = $(this).find('span.location, span.post-location');
            if (location.length > 0) {
                job.location = location.text().trim();
            }
            var sourceUrl = $('meta