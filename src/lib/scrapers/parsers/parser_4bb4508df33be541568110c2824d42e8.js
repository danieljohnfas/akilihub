const companyName = "Vodacom Tanzania";
const sourceUrl = $('link[rel="canonical"]').attr('href') || $('meta[property="og:url"]').attr('content') || '';
const postedDateIsoString = $('meta[property="article:published_time"]').attr('content') || '';

const normalizeJobType = (type) => {
    if (!type) return '';
    const lowerType = type.toLowerCase();
    if (lowerType.includes('full time')) return 'full_time';
    if (lowerType.includes('part time')) return 'part_time';
    if (lowerType.includes('contract')) return 'contract';
    if (lowerType.includes('internship')) return 'internship';
    if (lowerType.includes('remote')) return 'remote';
    return '';
};

$('.entry-content h4').each((index, element) => {
    const jobTitleElement = $(element);
    let title = jobTitleElement.text().trim();

    title = title.replace(/^\d+\.\s*/, '').trim();

    const detailsList = jobTitleElement.next('ul');

    let descriptionItems = [];
    let location = '';
    let jobType = '';
    let deadlineText = '';

    detailsList.find('li').each((_idx, liElem) => {
        const text = $(liElem).text().trim();
        descriptionItems.push(text);

        if (text.startsWith('Location:')) {
            location = text.replace('Location:', '').trim();
        } else if (text.startsWith('Job Type:')) {
            jobType = text.replace('Job Type:', '').trim();
        } else if (text.startsWith('Application deadline:')) {
            deadlineText = text.replace('Application deadline:', '').trim();
        }
    });

    let deadlineIsoString = '';
    if (deadlineText) {
        try {
            const dateObj = new Date(deadlineText);
            if (!isNaN(dateObj.getTime())) {
                deadlineIsoString = dateObj.toISOString();
            }
        } catch (e) {
            // Date parsing failed, deadlineIsoString remains empty
        }
    }

    const description = descriptionItems.length > 0 ? descriptionItems.join('\n') : '';

    result.push({
        title: title,
        companyName: companyName,
        description: description,
        location: location,
        jobType: normalizeJobType(jobType),
        sourceUrl: sourceUrl,
        postedDateIsoString: postedDateIsoString,
        deadlineIsoString: deadlineIsoString,
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null
    });
});