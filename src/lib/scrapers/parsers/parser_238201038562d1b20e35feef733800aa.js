var seen = {};
var parseJson = function(text) {
    try {
        return JSON.parse(text);
    } catch (e) {
        return null;
    }
};
$('script[type="application/ld+json"]').each(function() {
    var text = $(this).text();
    var data = parseJson(text);
    if (!data) return;
    var items = Array.isArray(data) ? data : [data];
    items.forEach(function(item) {
        var type = item['@type'];
        var types = typeof type === 'string' ? [type] : (Array.isArray(type) ? type : []);
        if (types.some(function(t) { return t.includes('JobPosting'); })) {
            var title = item.title;
            if (!title) return;
            var company = '';
            if (item.hiringOrganization && item.hiringOrganization.name) company = String(item.hiringOrganization.name).trim();
            var url = item.url || item.jobUrl || '';
            var key = url + title;
            if (seen[key]) return;
            seen[key] = true;
            var salarySpec = item.salarySpecification;
            var salaryMin = null;
            var salaryMax = null;
            var salaryCurrency = '';
            if (salarySpec && typeof salarySpec === 'object') {
                salaryMin = salarySpec.minimumAmount ? Number(salarySpec.minimumAmount) : null;
                salaryMax = salarySpec.maximumAmount ? Number(salarySpec.maximumAmount) : null;
                salaryCurrency = salarySpec.currencyCode || '';
            }
            result.push({
                title: String(title).trim(),
                companyName: company,
                description: item.description ? String(item.description).trim() : '',
                location: (item.jobLocation && item.jobLocation.name) ? String(item.jobLocation.name).trim() : '',
                jobType: item.jobType ? String(item.jobType).toLowerCase() : '',
                sourceUrl: String(url).trim(),
                postedDateIsoString: item.datePosted ? String(item.datePosted).trim() : '',
                deadlineIsoString: item.validThrough ? String(item.validThrough).trim() : '',
                salaryMin: salaryMin,
                salaryMax: salaryMax,
                salaryCurrency: String(salaryCurrency).trim()
            });
        }
    });
});
if (result.length === 0) {
    var selectors = ['.job-card', '.listing-item', '.vacancy-card', 'article[data-qa="job"], li.job, [role="listitem"].job'];
    $(selectors.join(', ')).each(function() {
        var $el = $(this);
        var title = $el.find('h1, h2, h3, h4, h5, h6').first().text().trim();
        var company = $el.find('.company-name, .employer, .company, [itemprop="hiringOrganization"]').first().text().trim();
        if (title) {
            var url = $el.find('a[href]').first().attr('href');
            var key = url + title;
            if (seen[key]) return;
            seen[key] = true;
            result.push({
                title: title,
                companyName: company,
                sourceUrl: url ? String(url).trim() : ''
            });
        }
    });
}
(function() {
    var resultLength = result.length;
})();