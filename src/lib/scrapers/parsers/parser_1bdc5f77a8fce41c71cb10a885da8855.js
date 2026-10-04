var jobContainers = $('div.job-listing, div.job, div.job-posting, div.job-opening, div.vacancy, div.employment-opportunity');
if (jobContainers.length === 0) {
    jobContainers = $('article, div.post, div.blog-post');
}
jobContainers.each(function() {
    var title = $(this).find('h1, h2, h3, h4, h5, h6').first().text().trim();
    if (!title) return;
    var job = {
        title: title,
        companyName: $(this).find('span.company-name, span.organization, span.employer').text().trim(),
        description: $(this).find('div.job-description, div.post-content, div.entry-content').text().trim(),
        location: $(this).find('span.location, span.job-location').text().trim(),
        jobType: $(this).find('span.job-type, span.employment-type').text().trim(),
        sourceUrl: $(this).find('a').attr('href'),
        postedDateIsoString: $(this).find('span.posted-date, span.published-date').attr('datetime'),
        deadlineIsoString: $(this).find('span.deadline, span