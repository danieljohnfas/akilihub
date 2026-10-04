const $jobElements = $('.entry-title, .job-title, .vacancy, .job-listing, article');

$jobElements.each((_, el) => {
    const $el = $(el);
    const title = $el.text().trim();

    const companyMatch = title.match(/at\s+(.+)$/i);
    const companyName = companyMatch ? companyMatch[1].trim() : title.replace(/.*?at\s*/i, '').trim();

    const jobTypeMatch = (title + ' ' + $el.text()).match(/\b(Full\s*Time|Part\s*Time|Contract|Internship|Remote)\b/i);
    const jobType = jobTypeMatch ? jobTypeMatch[1].toLowerCase() : '';

    const sourceUrl = $('link[rel="canonical"]').attr('href') || '';

    const postedDateIsoString = $('meta[property="article:published_time"]').attr('content') || '';

    let salaryMin = 0, salaryMax = 0, salaryCurrency = '';
    const salaryText = (title + ' ' + $el.text()).replace(/[^\d\.\-]/g, ' ');
    const salaryNumbers = salaryText.match(/\d+(?:\.\d+)?/g);
    if (salaryNumbers && salaryNumbers.length >= 2) {
        salaryMin = parseFloat(salaryNumbers[0]);
        salaryMax = parseFloat(salaryNumbers[1]);
    }

    result.push({
        title,
        companyName,
        description: '',
        location: '',
        jobType,
        sourceUrl,
        postedDateIsoString,
        deadlineIsoString: '',
        salaryMin,
        salaryMax,
        salaryCurrency
    });
});