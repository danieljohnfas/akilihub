const job = {};

// Source URL
job.sourceUrl = $('link[rel="canonical"]').attr('href');

// OG Title: e.g., "Customer Service Executive Job Vacancy at Mend East Africa Limited – Dar es Salaam, Tanzania - assengaonline.com -"
const ogTitle = $('meta[property="og:title"]').attr('content');

// OG Description: e.g., "Customer Service Executive Job Vacancy at Mend East Africa Limited – Dar es Salaam, Tanzania"
const ogDescription = $('meta[property="og:description"]').attr('content');

// Confirm it's a job-related page before attempting detailed extraction
const articleSection = $('meta[property="article:section"]').attr('content');
const isJobPageCandidate = (ogTitle && (ogTitle.toLowerCase().includes('job vacancy') || ogTitle.toLowerCase().includes('hiring') || ogTitle.toLowerCase().includes('opportunity') || ogTitle.toLowerCase().includes('position') || ogTitle.toLowerCase().includes('internship'))) ||
                           (ogDescription && (ogDescription.toLowerCase().includes('job vacancy') || ogDescription.toLowerCase().includes('hiring') || ogDescription.toLowerCase().includes('opportunity'))) ||
                           (articleSection && articleSection.toLowerCase() === 'jobs');

if (isJobPageCandidate && ogTitle) {
    // Attempt to extract Title from og:title
    let potentialTitle = ogTitle.split(' at ')[0].trim(); // Get everything before " at "
    // Clean up common job-related keywords and trailing delimiters/site names
    potentialTitle = potentialTitle
        .replace(/\s(?:Job Vacancy|Internship|Hiring|Opportunity|Position|Opening|Career)\b/i, '')
        .split(' – ')[0] // Remove content after ' – '
        .split(' - ')[0] // Remove content after ' - '
        .trim();
    job.title = potentialTitle;


    // Attempt to extract Company Name from og:title
    const companyMatch = ogTitle.match(/at\s(.*?)(?:\s–|\s-|\s$)/i); // Capture between "at " and " –" or " -" or end of string
    if (companyMatch && companyMatch[1]) {
        job.companyName = companyMatch[1].trim();
    } else {
        // Fallback for company name: after "at " and before location/site name if no clear separator
        const parts = ogTitle.split(' at ');
        if (parts.length > 1) {
            let companyPart = parts[1].split(' – ')[0].split(' - ')[0].trim();
            if (companyPart.length > 0) {
                job.companyName = companyPart;
            }
        }
    }

    // Attempt to extract Location
    let extractedLocation = '';
    // Prefer schema.org if available
    const schemaOrgScript = $('script[type="application/ld+json"].rank-math-schema').html();
    if (schemaOrgScript) {
        try {
            const schemaOrgData = JSON.parse(schemaOrgScript);
            if (schemaOrgData && schemaOrgData['@graph']) {
                const place = schemaOrgData['@graph'].find(item => item['@type'] === 'Place' && item.address);
                if (place && place.address && place.address.streetAddress) {
                    extractedLocation = place.address.streetAddress;
                }
            }
        } catch (e) {
            // Silently ignore JSON parsing errors
        }
    }

    if (!extractedLocation) {
        // Fallback to og:title: After '–' and before ' - ' or end of string
        const locationMatch = ogTitle.match(/–\s(.*?)(?:\s-\s|\s$)/i);
        if (locationMatch && locationMatch[1]) {
            extractedLocation = locationMatch[1].split(' - ')[0].trim();
        } else if (job.companyName && ogTitle.includes(job.companyName)) {
             // Another fallback for location after company, before site name, for cases like "at Company - Location"
            const afterCompany = ogTitle.split(job.companyName)[1];
            const locationAfterCompanyMatch = afterCompany.match(/^(?:\s(?:–|-))\s(.*?)(?:\s-\s|\s$)/i); // Match ' – ' or ' - '
            if (locationAfterCompanyMatch && locationAfterCompanyMatch[1]) {
                 extractedLocation = locationAfterCompanyMatch[1].split(' - ')[0].trim();
            }
        }
    }
    job.location = extractedLocation;

    // Description (use og:description if available and not just a repetition of title/company)
    if (ogDescription && ogDescription.trim().length > 0) {
        const cleanDescription = ogDescription.trim();
        const cleanTitle = (job.title || '').trim();
        const cleanCompanyName = (job.companyName || '').trim();

        // Avoid description being just title, or title at company, or similar
        const isRedundant = cleanDescription.toLowerCase() === cleanTitle.toLowerCase() ||
                            cleanDescription.toLowerCase() === (cleanTitle + ' at ' + cleanCompanyName).toLowerCase() ||
                            cleanDescription.toLowerCase() === (cleanTitle + ' ' + cleanCompanyName).toLowerCase();

        if (!isRedundant) {
            job.description = cleanDescription;
        }
    }

    // Posted Date
    job.postedDateIsoString = $('meta[property="article:published_time"]').attr('content');

    // Ensure job.title is not empty/null after all parsing before pushing to results
    if (job.title && job.title.length > 0 && job.sourceUrl) {
        result.push(job);
    }
}