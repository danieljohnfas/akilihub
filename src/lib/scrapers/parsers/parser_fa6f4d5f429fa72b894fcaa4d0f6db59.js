const $candidates = $('body').find('article, .job, .job-card, [role="article"], .listing-item, [itemprop="jobPosting"]');
$candidates.each(function () {
    const $card = $(this);
    const $title = $card.find('h1, h2, h3, .job-title, h4').first();
    if (!$title.length) return;
    const title = $title.text().trim();
    if (!title || title.length < 4) return;
    if (title === 'Dev Jobs Tanzania' || title === 'Development Jobs Tanzania') return;
    const link = $card.find('a').first().attr('href');
    const href = link || $title.find('a').first().attr('href') || '';
    if (!href) return;
    result.push({
        title: title,
        companyName: $card.find('.company-name, .company, .organization').first().text().trim(),
        description: $card.find('.description, .summary, .details, p').first().text().trim(),
        location: $card.find('.location, .place, .geo').first().text().trim(),
        jobType: $card.find('.type, .job-type, .employment').first().text().trim(),
        sourceUrl: href,
        postedDateIsoString: '',
        deadlineIsoString: '',
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: ''
    });
});