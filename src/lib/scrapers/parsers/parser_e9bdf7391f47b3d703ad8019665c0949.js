var jobContainers = $('.table.table-hover tr');
if (jobContainers.length > 0) {
    jobContainers.each(function () {
        var jobTitle = $(this).find('a').text().trim();
        if (jobTitle) {
            var job = {
                title: jobTitle,
                companyName: 'Tanga Technical Secondary School',
                sourceUrl: 'https://tangatechnical.ac.tz', // replace with actual source URL
                description: '',
                location: '',
                jobType: '',
                postedDateIsoString: '',
                deadlineIsoString: '',
                salaryMin: 0,
                salaryMax: 0,
                salaryCurrency: ''
            };
            result.push(job);
        }
    });
}