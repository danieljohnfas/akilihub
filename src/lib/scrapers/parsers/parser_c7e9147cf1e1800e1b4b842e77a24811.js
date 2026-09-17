var jobTiles = $('.job-tile');

jobTiles.each(function() {
    var jobTile = $(this);

    var titleElement = jobTile.find('h4.job-tile-title a');
    var title = titleElement.text().trim();

    if (!title) {
        return;
    }

    var sourceUrlRelative = titleElement.attr('href');
    var sourceUrl = sourceUrlRelative ? new URL(sourceUrlRelative, 'https://jobs.vodafone.com').href : null;

    var companyName = 'Vodafone';

    var location = jobTile.find('.job-tile-location').text().trim();

    var jobTypeRaw = jobTile.find('.job-tile-type').text().trim();
    var jobType = null;
    if (jobTypeRaw) {
        var lowerJobType = jobTypeRaw.toLowerCase();
        if (lowerJobType.includes('full-time')) {
            jobType = 'full_time';
        } else if (lowerJobType.includes('part-time')) {
            jobType = 'part_time';
        } else if (lowerJobType.includes('contract')) {
            jobType = 'contract';
        } else if (lowerJobType.includes('internship')) {
            jobType = 'internship';
        } else if (lowerJobType.includes('remote')) {
            jobType = 'remote';
        }
    }

    var description = jobTile.find('.job-tile-description p').text().trim();

    result.push({
        title: title,
        companyName: companyName,
        description: description,
        location: location,
        jobType: jobType,
        sourceUrl: sourceUrl,
        postedDateIsoString: null,
        deadlineIsoString: null,
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null
    });
});