var foundJobs = false;
$('script[type="application/ld+json"]').each(function() {
    try {
        var data = JSON.parse($(this).text());
        var graph = data['@graph'] || [data];
        if (!Array.isArray(graph)) graph = [graph];
        graph.forEach(function(item) {
            var type = item['@type'];
            if (type && (type === 'JobPosting' || (typeof type === 'string' && type.indexOf('JobPosting') !== -1))) {
                foundJobs = true;
                result.push({
                    title: item.name || item.title || '',
                    companyName: (item.hiringOrganization && item.hiringOrganization.name) || '',
                    description: item.description || '',
                    location: '',
                    jobType: '',
                    sourceUrl: item.url || '',
                    postedDateIsoString: '',
                    deadlineIsoString: ''
                });
            }
        });
    } catch (e) {}
});
if (!foundJobs) {
    var candidates = $('div.job, article.job, .job-posting, .job-card, .listing, li.job, .job-item');
    candidates.each(function() {
        var $el = $(this);
        var title = $el.find('h1, h2, h3, h4').first().text().trim();
        var company = $el.find('.company, .employer, .company-name, .org').first().text().trim();
        var text = $el.text().toLowerCase();
        if (title && title.length > 2 && (text.indexOf('apply') !== -1 || text.indexOf('salary') !== -1 || company.length > 2)) {
            result.push({
                title: title,
                companyName: company,
                description: $el.find('.description, .job-details, .about-the-job, .overview').first().text().trim(),
                location: '',
                jobType: '',
                sourceUrl: $el.find('a[href]').first().attr('href') || ''
            });
        }
    });
}