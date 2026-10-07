var title = $('title').text().toLowerCase();
var description = $('meta[name="description"]').attr('content') || '';
var isJobPage = title.indexOf('job') !== -1 || description.indexOf('job') !== -1 || description.indexOf('hiring') !== -1;
var isDirectory = title.indexOf('directory') !== -1 || description.indexOf('directory') !== -1;
if (!isJobPage || isDirectory) {
    result.length = 0;
} else {
    result.length = 0;
    $('[itemtype="https://schema.org/JobPosting"]').each(function() {
        var $job = $(this);
        var orgSelector = $job.find('[itemprop="hiringOrganization"]');
        result.push({
            title: $job.find('[itemprop="title"]').text().trim(),
            companyName: orgSelector.length ? orgSelector.find('[itemprop="name"]').text().trim() : '',
            description: $job.find('[itemprop="description"]').text().trim(),
            location: $job.find('[itemprop="jobLocation"] [itemprop="address"]').text().trim(),
            sourceUrl: $job.find('[itemprop="url"]').attr('href') || $job.find('[itemprop="url"]').text().trim()
        });
    });
}