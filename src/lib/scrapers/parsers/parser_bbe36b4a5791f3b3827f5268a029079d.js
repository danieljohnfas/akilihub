let companyName = '';
const ogDescription = $('meta[property="og:description"]').attr('content');
const ogTitle = $('meta[property="og:title"]').attr('content');
const pageTitle = $('title').text();

if (ogDescription) {
    let match = ogDescription.match(/Jobs at (.*?)(?: \w+ \d{4})?,/i);
    if (match && match[1]) {
        companyName = match[1].trim();
    }
}

if (!companyName && ogTitle) {
    let match = ogTitle.match(/Jobs At (.*?)(?: \w+ \d{4})? \|/i);
    if (match && match[1]) {
        companyName = match[1].trim();
    }
}

if (!companyName && pageTitle) {
    let match = pageTitle.match(/(?:at|for)\s(.*?)(?: Ltd| Plc| Bank)?\s(?:\w+\s?\d{4})?/i);
    if (match && match[1]) {
        companyName = match[1].trim();
    }
}

if (!companyName && (
    $('meta[property="article:tag"][content*="Exim Bank"]').length > 0 ||
    pageTitle.includes('Exim Bank') ||
    (ogDescription && ogDescription.includes('Exim Bank')) ||
    (ogTitle && ogTitle.includes('Exim Bank'))
)) {
    companyName = 'Exim Bank Ltd';
}

const sourceUrl = $('link[rel="canonical"]').attr('href') || $('meta[property="og:url"]').attr('content') || '';
const postedDateIsoString = $('meta[property="article:published_time"]').attr('content') || '';

const jobHeadings = $('h3:contains("JOB TITLE:")');

if (jobHeadings.length > 0) {
    jobHeadings.each((index, element) => {
        const $jobHeading = $(element);
        const title = $jobHeading.text().replace('JOB TITLE:', '').trim();

        if (!title) {
            return;
        }

        let descriptionParts = [];
        let currentElement = $jobHeading.next();

        while (currentElement.length > 0 && !(currentElement.is('h3') && currentElement.text().startsWith('JOB TITLE:'))) {
            const text = currentElement.text().trim();
            if (text) {
                descriptionParts.push(text);
            }
            currentElement = currentElement.next();
        }
        const description = descriptionParts.join('\n\n').trim();

        result.push({
            title: title,
            companyName: companyName,
            description: description,
            location: '',
            jobType: '',
            sourceUrl: sourceUrl,
            postedDateIsoString: postedDateIsoString,
            deadlineIsoString: '',
            salaryMin: null,
            salaryMax: null,
            salaryCurrency: ''
        });
    });
}