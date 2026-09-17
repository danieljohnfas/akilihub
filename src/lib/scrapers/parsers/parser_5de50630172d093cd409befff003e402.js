var jobContainers = $('section[data-bind="css: {\'oj-fallback\': !$root.apisupport()}"]');
jobContainers.each(function() {
    var jobData = {};
    var titleEl = $(this).find('h3 a').first();
    if (titleEl.length === 0) {
        titleEl = $(this).find('.oj-choice-text,.oj-text-input').first();
    }
    if (titleEl.length > 0) {
        var titleText = titleEl.text().trim();
        if (titleText && titleText.length > 0) {
            jobData.title = titleText;
        }
    }
    if (jobData.title) {
        result.push(jobData);
    }
});
if (result.length === 0) {
    var allLinks = $('a[href*="job"], a[href*="Job"], a[href*="requisitions"], a[href*="Jobs"]');
    allLinks.each(function() {
        var linkText = $(this).text().trim();
        var href = $(this).attr('href') || '';
        if (linkText && linkText.length > 0 && linkText.length < 150) {
            var isHeading = $(this).closest('h1,h2,h3,h4,h5,h6').length > 0;
            if (isHeading || linkText.match(/^\b[A-Z][a-z]{3,}\s+[A-Z][a-z]+/i)) {
                var alreadyAdded = result.some(function(j) { return j.title === linkText; });
                if (!alreadyAdded) {
                    result.push({ title: linkText });
                }
            }
        }
    });
}