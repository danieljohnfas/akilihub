var jobContainers = $('article');
if (jobContainers.length === 0) {
    jobContainers = $('div.entry-content');
}
if (jobContainers.length > 0) {
    jobContainers.each(function() {
        var job = {};
        var title = $(this).find('h1.entry-title').text().trim();
        if (title) {
            job.title = title;
            var companyName = $(this).find('strong').first().text().trim();
            if (companyName) {
                job.companyName = companyName;
            }
            var description = $(this).find('div.entry-content').html();
            if (description) {
                job.description = description;
            }
            var location = $(this).find('strong:contains("Location:")').next().text().trim();
            if (location) {
                job.location = location;
            }
            var jobType = $(this).find('strong:contains("Job Type:")').next().text().trim();
            if (jobType) {
                job.jobType = jobType.toLowerCase().replace(' ', '_');
            }
            job.sourceUrl = 'https://ajiranew.com' + $(this).find('a.more-link').attr('href');
            var postedDate =