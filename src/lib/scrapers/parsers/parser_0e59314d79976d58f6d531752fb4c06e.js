try {
    const jobContainers = $('article');
    if (jobContainers.length === 0) {
        return;
    }
    jobContainers.each(function () {
        const job = {};
        job.title = $(this).find('h1').text().trim();
        if (!job.title) {
            return;
        }
        job.companyName = 'NMB Bank Plc';
        job.description = $(this).find('div.entry-content').text().trim();
        job.location = 'Tanzania';
        job.sourceUrl = 'https://ajiranew.com/new-vacancies-at-nmb-bank-plc-october-2026/';
        job.postedDateIsoString = '2026-10-03T06:31:07+00:00';
        result.push(job);
    });
} catch (error) {
    console.error(error);
}