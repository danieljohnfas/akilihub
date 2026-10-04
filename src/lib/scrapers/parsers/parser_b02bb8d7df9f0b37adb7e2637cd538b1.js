const job = {};

const pageTitle = $('title').text().trim();

// If there's no clear title, or the page is not formatted as a job posting,
// we must leave the result array empty as per critical instruction 2.
if (!pageTitle) {
    return;
}

job.title = pageTitle;

const metaDescriptionContent = $('meta[name="Description"]').attr('content');

job.companyName = null; // Company name is not explicitly available in the provided HTML snippet.

// The meta description is the most detailed text available to serve as the job description.
job.description = metaDescriptionContent ? metaDescriptionContent.trim() : null;

// Extract location and jobType from metaDescriptionContent if available
if (metaDescriptionContent) {
    // The example format is: "Engineering Tanzania Mwanza Mid-Career Professional Full Time / Permanent Diploma 3 - 5 Years"

    // Extract location (e.g., "Tanzania Mwanza"). This regex assumes a pattern where location
    // is found between "Engineering" and a common career level descriptor.
    const locationMatch = metaDescriptionContent.match(/Engineering\s+([A-Za-z\s]+?)\s+(?:Mid-Career Professional|Entry Level|Senior Level|Junior Level|Intern)/i);
    if (locationMatch && locationMatch[1]) {
        job.location = locationMatch[1].trim();
    } else {
        job.location = null;
    }

    // Extract jobType (e.g., "Full Time / Permanent") and map it to a standard enum.
    const jobTypeMatch = metaDescriptionContent.match(/(Full Time \/ Permanent|Part Time|Contract|Internship|Remote)/i);
    if (jobTypeMatch && jobTypeMatch[1]) {
        const matchedType = jobTypeMatch[1].toLowerCase();
        if (matchedType.includes('full time')) {
            job.jobType = 'full_time';
        } else if (matchedType.includes('part time')) {
            job.jobType = 'part_time';
        } else if (matchedType.includes('contract')) {
            job.jobType = 'contract';
        } else if (matchedType.includes('internship')) {
            job.jobType = 'internship';
        } else if (matchedType.includes('remote')) {
            job.jobType = 'remote';
        } else {
            job.jobType = null;
        }
    } else {
        job.jobType = null;
    }
} else {
    job.location = null;
    job.jobType = null;
}

// Source URL: not explicitly present as a link in the provided HTML snippet.
job.sourceUrl = null;

// Other fields are not present in the provided HTML snippet.
job.postedDateIsoString = null;
job.deadlineIsoString = null;
job.salaryMin = null;
job.salaryMax = null;
job.salaryCurrency = null;

// Push the extracted job object to the result array.
result.push(job);