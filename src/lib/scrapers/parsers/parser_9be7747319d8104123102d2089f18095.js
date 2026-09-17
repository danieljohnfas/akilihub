const job = {};

// Extract sourceUrl from meta tag
job.sourceUrl = $('meta[property="og:url"]').attr('content') || '';

// Extract title, companyName, and location from og:title meta tag
let fullTitleString = $('meta[property="og:title"]').attr('content');
if (fullTitleString) {
    // Remove site name " - CAREERS"
    let cleanTitleString = fullTitleString.replace(/ - CAREERS$/, '');

    // Extract Job Title
    // This regex attempts to get everything before " Job Vacancy at " or before a common location/date pattern
    const jobTitleMatch = cleanTitleString.match(/^(.+?) (?:Job Vacancy at|at .*?, .*? \w+ \d{4}$)/i);
    if (jobTitleMatch && jobTitleMatch[1]) {
        job.title = jobTitleMatch[1].trim();
    } else {
        // Fallback for less common patterns, just remove location/date part
        job.title = cleanTitleString.replace(/ at .*?, .*? \w+ \d{4}$/i, '').trim();
        // A second attempt to clean if "Job Vacancy at" was not found but still present
        job.title = job.title.replace(/ Job Vacancy$/, '').trim();
    }

    // Extract Company Name
    const companyMatch = cleanTitleString.match(/at ([^,]+?(?: Bank| Group| Plc| Corporation| Inc| Ltd| S\.A\.| Co\.| LLC| Corp)?),/i);
    if (companyMatch && companyMatch[1]) {
        job.companyName = companyMatch[1].trim();
    }

    // Extract Location
    const locationMatch = cleanTitleString.match(/, ([A-Za-z\s-]+) (?:January|February|March|April|May|June|July|August|September|October|November|December) \d{4}/i);
    if (locationMatch && locationMatch[1]) {
        job.location = locationMatch[1].trim();
    }
}

// Extract description
// Prioritize og:description for a summary, as full content might be dynamic or not fully loaded in the sample
job.description = $('meta[property="og:description"]').attr('content') || '';

// Extract postedDateIsoString
let publishedTime = $('meta[property="article:published_time"]').attr('content');
if (publishedTime) {
    try {
        job.postedDateIsoString = new Date(publishedTime).toISOString();
    } catch (e) {
        // Invalid date format
    }
}

// Extract deadlineIsoString
if (fullTitleString) {
    const deadlineMonthYearMatch = fullTitleString.match(/(January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})/i);
    if (deadlineMonthYearMatch) {
        const monthName = deadlineMonthYearMatch[1];
        const year = parseInt(deadlineMonthYearMatch[2], 10);
        // Date.parse can convert month name to a numeric month (0-11)
        const monthIndex = new Date(Date.parse(`${monthName} 1, ${year}`)).getMonth();
        
        // Create a date object for the first day of the *next* month
        const deadlineDate = new Date(year, monthIndex + 1, 1);
        // Subtract one day to get the last day of the target month
        deadlineDate.setDate(deadlineDate.getDate() - 1);
        
        // Set time to end of day in UTC
        deadlineDate.setUTCHours(23, 59, 59, 999); 
        job.deadlineIsoString = deadlineDate.toISOString();
    }
}

// Only push to result if it's a valid job posting with at least a title and company
if (job.title && job.companyName) {
    result.push(job);
}