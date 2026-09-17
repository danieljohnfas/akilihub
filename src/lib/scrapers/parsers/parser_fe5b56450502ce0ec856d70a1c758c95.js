const companyName = "Selcom";

let baseUrl = $('link[rel="canonical"]').attr('href');
if (baseUrl) {
    try {
        const url = new URL(baseUrl);
        baseUrl = url.origin;
    } catch (e) {
        baseUrl = '';
    }
} else {
    baseUrl = '';
}

// Select all potential job title elements across the entire page's content areas.
// These are typically within .sqs-html-content blocks on Squarespace.
// We look for h3, h4, or strong text within a paragraph, which commonly serve as job titles.
const allPotentialTitleElements = $('div.sqs-html-content h3, div.sqs-html-content h4, div.sqs-html-content p strong');

allPotentialTitleElements.each((i, el) => {
    const $titleElement = $(el);
    let title = $titleElement.text().trim();

    // Filter out generic section titles or very short non-job-like titles.
    // This prevents extracting headings like "Careers" or "Open Positions" as actual jobs.
    if (!title || title.length < 5 || ['careers', 'jobs', 'current openings', 'vacancies'].includes(title.toLowerCase())) {
        return;
    }

    // Determine the effective "container" for this job's details.
    // This is typically the closest .sqs-html-content parent, ensuring we gather details
    // that belong to the current job within its logical content block.
    const $jobParentContainer = $titleElement.closest('div.sqs-html-content');

    let descriptionParts = [];
    let location = '';
    let jobType = '';
    let sourceUrl = '';
    let foundSourceUrlForThisJob = false; // Flag to ensure we only extract one main apply link per job

    // Start iterating from the element immediately following the title element.
    // If the title is `p strong`, its parent `p` is the actual element in the flow.
    let currentElement = $titleElement.is('p strong') ? $titleElement.parent().next() : $titleElement.next();

    // Iterate through subsequent siblings within the job's parent container.
    // The loop stops if another potential job title (h3, h4, p strong) is encountered,
    // or if we exit the current logical job block (identified by $jobParentContainer).
    while (currentElement.length > 0 && !currentElement.is('h3, h4, p strong') && currentElement.closest('div.sqs-html-content').is($jobParentContainer)) {
        const text = currentElement.text().trim();

        if (currentElement.is('p')) {
            if (text.toLowerCase().startsWith('location:')) {
                location = text.replace(/location:\s*/i, '').trim();
            } else if (text.toLowerCase().startsWith('job type:')) {
                let type = text.replace(/job type:\s*/i, '').trim().toLowerCase();
                if (type.includes('full-time')) jobType = 'full_time';
                else if (type.includes('part-time')) jobType = 'part_time';
                else if (type.includes('contract')) jobType = 'contract';
                else if (type.includes('internship')) jobType = 'internship';
                else if (type.includes('remote')) jobType = 'remote';
                else jobType = type; // Keep other types as is
            } else {
                // If the paragraph content is solely an anchor link (e.g., "<p><a href="...">Apply Now</a></p>"),
                // extract it as a sourceUrl and avoid adding it to the description.
                const linkInP = currentElement.find('a[href]');
                if (linkInP.length > 0 && linkInP.text().trim() === text) {
                    if (!foundSourceUrlForThisJob) {
                        const linkText = linkInP.text().toLowerCase();
                        if (linkText.includes('apply') || linkText.includes('view job') || linkText.includes('learn more') || linkText.includes(title.toLowerCase().substring(0, Math.min(title.length, 15)))) {
                            sourceUrl = linkInP.attr('href');
                            foundSourceUrlForThisJob = true;
                        }
                    }
                } else if (text.length > 0) { // Add non-empty text to description
                    descriptionParts.push(text);
                }
            }
        } else if (currentElement.is('a') && !foundSourceUrlForThisJob) { // Direct anchor tag sibling (not wrapped in p)
            const linkText = currentElement.text().toLowerCase();
            if (linkText.includes('apply') || linkText.includes('view job') || linkText.includes('learn more') || linkText.includes(title.toLowerCase().substring(0, Math.min(title.length, 15)))) {
                sourceUrl = currentElement.attr('href');
                foundSourceUrlForThisJob = true;
            }
        } else if (currentElement.is('div') || currentElement.is('span')) {
            // Include text from other relevant sibling elements that might be part of the description.
            const innerText = currentElement.text().trim();
            if (innerText.length > 0) {
                 descriptionParts.push(innerText);
            }
        }

        currentElement = currentElement.next();
    }

    // Filter out extracted location/jobType details from the description parts to avoid redundancy.
    const finalDescription = descriptionParts.filter(part =>
        !(location && part.includes(location)) &&
        !(jobType && part.toLowerCase().includes(jobType.replace('_', ' ')))
    ).join('\n').trim();

    // Resolve relative source URLs using the base URL.
    if (sourceUrl) {
        if (sourceUrl.startsWith('/') && baseUrl) {
            sourceUrl = baseUrl + sourceUrl;
        } else if (!sourceUrl.startsWith('http') && baseUrl) {
            try {
                sourceUrl = new URL(sourceUrl, baseUrl).href;
            } catch (e) {
                sourceUrl = ''; // Handle cases of malformed relative URLs
            }
        }
    }

    // Clean up the title from common "call to action" phrases.
    title = title.replace(/apply now/i, '').replace(/view details/i, '').replace(/learn more/i, '').trim();

    // Only push a job if it has a valid title and a substantial description.
    // This helps filter out potential false positives or incomplete job entries.
    if (title && finalDescription.length > 20) {
        result.push({
            title: title,
            companyName: companyName,
            description: finalDescription,
            location: location,
            jobType: jobType,
            sourceUrl: sourceUrl,
            // postedDateIsoString, deadlineIsoString, salaryMin, salaryMax, salaryCurrency
            // are not consistently available in the given HTML structure.
        });
    }
});