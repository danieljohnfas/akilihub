var jobContainer = $('.header');
if (jobContainer.length > 0) {
    jobContainer.each(function () {
        var job = {};
        job.title = $(this).find('.title').text().trim();
        job.companyName = $(this).find('.job-heading').text().trim();
        job.location = $(this).find('.fa-map-marker').parent().text().trim().replace('Arusha', '').replace('04/09/26 -04/10/26', '').trim();
        job.postedDateIsoString = '2026-09-04T00:00:00.000Z';
        job.deadlineIsoString = '2026-10-04T00:00:00.000Z';
        job.sourceUrl = 'https://tenders.mcl.co.tz';
        var descriptionContainer = $('.content-container');
        if (descriptionContainer.length > 0) {
            job.description = descriptionContainer.find('p').text().trim();
        }
        result.push(job);
    });
}