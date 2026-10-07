const cleanText = (element) => {
    return element && element.length ? element.text().trim().replace(/\s\s+/g, ' ') : null;
};

const cleanTextWithoutIcon = (selector, parentElement) => {
    const element = parentElement.find(selector);
    if (!element.length) return null;
    return element.clone().children('i').remove().end().text().trim().replace(/\s\s+/g, ' ');
};

const parseRelativeDate = (dateText) => {
    if (!dateText) return null;
    dateText = dateText.toLowerCase();

    const now = new Date();
    let date = null;

    if (dateText.includes('today')) {
        date = now;
    } else if (dateText.includes('yesterday')) {
        date = new Date(now);
        date.setDate(now.getDate() - 1);
    } else {
        const matchDays = dateText.match(/(\d+)\s+day(?:s)?\s+ago/);
        if (matchDays) {
            const days = parseInt(matchDays[1], 10);
            date = new Date(now);
            date.setDate(now.getDate() - days);
        } else {
            const matchWeeks = dateText.match(/(\d+)\s+week(?:s)?\s+ago/);
            if (matchWeeks) {
                const weeks = parseInt(matchWeeks[1], 10);
                date = new Date(now);
                date.setDate(now.getDate() - (weeks * 7));
            } else {
                const matchHours = dateText.match(/(\d+)\s+hour(?:s)?\s+ago/);
                if (matchHours) {
                    const hours = parseInt(matchHours[1], 10);
                    date = new Date(now);
                    date.setHours(now.getHours() - hours);
                } else {
                    try {
                        const parsed = new Date(dateText);
                        if (!isNaN(parsed.getTime())) {
                            date = parsed;
                        }
                    } catch (e) {
                        // Ignore parsing errors for non-standard formats
                    }
                }
            }
        }
    }
    return date ? date.toISOString() : null;
};

// Select job listing containers. The provided HTML sample is incomplete and
// does not contain actual job listings. Therefore, this selector is a common
// guess for a job item wrapper. For the given HTML, it will yield an empty set,
// causing the 'result' array to remain empty, which correctly adheres to
// instruction #2 (leave result empty if no real job postings).
$('.single-job-item').each((index, element) => {
    const jobElement = $(element);

    const titleElement = jobElement.find('.job-title a');
    const title = cleanText(titleElement);
    const sourceUrl = titleElement.attr('href') ? new URL(titleElement.attr('href'), 'https://ajira.co.tz').href : null;

    const companyName = cleanText(jobElement.find('.company-name'));
    const description = cleanText(jobElement.find('.job-description'));
    const location = cleanTextWithoutIcon('.location', jobElement);

    let jobType = cleanTextWithoutIcon('.job-type', jobElement);
    if (jobType) {
        jobType = jobType.toLowerCase();
        if (jobType.includes('full-time')) jobType = 'full_time';
        else if (jobType.includes('part-time')) jobType = 'part_time';
        else if (jobType.includes('contract')) jobType = 'contract';
        else if (jobType.includes('internship')) jobType = 'internship';
        else if (jobType.includes('remote')) jobType = 'remote';
        else jobType = null;
    }

    const postedDateText = cleanTextWithoutIcon('.posted-date', jobElement);
    const postedDateIsoString = parseRelativeDate(postedDateText);

    if (title) { // Only add if a clear job title is found
        result.push({
            title: title,
            companyName: companyName,
            description: description,
            location: location,
            jobType: jobType,
            sourceUrl: sourceUrl,
            postedDateIsoString: postedDateIsoString,
            deadlineIsoString: null,
            salaryMin: null,
            salaryMax: null,
            salaryCurrency: null
        });
    }
});