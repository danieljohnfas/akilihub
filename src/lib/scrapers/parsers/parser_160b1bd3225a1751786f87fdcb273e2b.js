try {
    const jobContainers = $('div.post-body.entry-content');
    if (jobContainers.length === 0) {
        return;
    }

    jobContainers.each(function () {
        const jobContainer = $(this);
        const jobTitle = jobContainer.find('h2, h3, h4, h5, h6').first().text().trim();
        if (!jobTitle) {
            return;
        }

        const job = {
            title: jobTitle,
            companyName: 'Zanzibar College of Health and Technology',
            sourceUrl: 'http://www.mavusu.com/2026/08/multiple-vacancies-at-zanzibar-college.html',
        };

        const jobDescription = jobContainer.find('p').map(function () {
            return $(this).text().trim();
        }).get().join('\n');
        job.description = jobDescription;

        const locationMatch = jobDescription.match(/location\s*:\s*(.*)/i);
        if (locationMatch) {
            job.location = locationMatch[1].trim();
        }

        const typeMatch = jobDescription.match(/type\s*:\s*(.*)/i);
        if (typeMatch) {
            job.jobType = type