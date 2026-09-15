let job = {};

// sourceUrl
job.sourceUrl = $('link[rel="canonical"]').attr('href') || $('meta[property="og:url"]').attr('content') || null;

// postedDateIsoString
job.postedDateIsoString = $('meta[property="article:published_time"]').attr('content') || $('meta[property="og:updated_time"]').attr('content') || null;

// description (using og:description as a summary, as full body content is not in the provided HTML sample)
job.description = $('meta[property="og:description"]').attr('content') || null;

// Initialize other fields to null as they are not explicitly present in the HTML sample
job.jobType = null;
job.deadlineIsoString = null;
job.salaryMin = null;
job.salaryMax = null;
job.salaryCurrency = null;
job.title = null;
job.companyName = null;
job.location = null;

let ogTitle = $('meta[property="og:title"]').attr('content');
let ogDescription = $('meta[property="og:description"]').attr('content');

if (ogTitle) {
    // Clean and parse ogTitle to extract companyName and title
    // Example: "Nafasi ya Kazi LUMAC Tanzania 2026: Accountant – Omba Sasa!"
    let cleanedOgTitle = ogTitle
        .replace(/^Nafasi ya Kazi\s+/i, '') // Remove "Nafasi ya Kazi " prefix
        .replace(/\s+–\s+Omba Sasa!$/i, '') // Remove " - Omba Sasa!" suffix
        .trim();

    let parts = cleanedOgTitle.split(':');
    if (parts.length > 1) {
        // Assume the last part is the job title
        job.title = parts.pop().trim();
        // The remaining part is the company name, potentially with a year
        job.companyName = parts.join(':').replace(/\s+\d{4}$/, '').trim(); // Remove year (e.g., " 2026")
    } else {
        // Fallback for titles without a colon, e.g., "Company 2026 Title"
        let simplifiedMatch = cleanedOgTitle.match(/^([A-Za-z\s]+?)(?:\s+\d{4})?\s+([A-Za-z\s]+?)$/i);
        if (simplifiedMatch && simplifiedMatch[1] && simplifiedMatch[2]) {
            job.companyName = simplifiedMatch[1].trim();
            job.title = simplifiedMatch[2].trim();
        } else {
            // Further fallback if title is very simple, assumes last word is job title
            let words = cleanedOgTitle.split(/\s+/);
            if (words.length > 1) {
                job.title = words.pop();
                job.companyName = words.join(' ').replace(/\s+\d{4}$/, '').trim();
            } else if (words.length === 1) {
                job.title = words[0];
            }
        }
    }
}

if (ogDescription) {
    // Attempt to extract location from ogDescription
    // Example: "Nafasi ya Kazi LUMAC Tanzania 2026 Accountant Dar es Salaam imetangazwa rasmi."
    // Look for common job title types followed by a capitalized location
    let locationMatch = ogDescription.match(/(?:Accountant|Engineer|Developer|Manager|Consultant|Specialist|Officer|Assistant)\s+([A-Z][a-z]+(?:(?:\s|-)[A-Z]?[a-z]+)*?)(?:\s+imetangazwa|\s+imewekwa|\s+iko|\s+located|\s+in|\s+at|$)/i);
    if (locationMatch && locationMatch[1]) {
        job.location = locationMatch[1].trim();
    } else {
        // Broader search for common city names as a fallback
        let cities = ['Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Zanzibar', 'Nairobi', 'Kampala', 'Kigali', 'Mombasa', 'Remote'];
        for (let i = 0; i < cities.length; i++) {
            if (ogDescription.includes(cities[i])) {
                job.location = cities[i];
                break;
            }
        }
    }
}

// Final validation: Only add to result if a clear job title and company are found.
// This filters out generic articles or non-job postings.
const validJobKeywords = ['Accountant', 'Engineer', 'Developer', 'Manager', 'Analyst', 'Specialist', 'Assistant', 'Officer', 'Coordinator', 'Director', 'Lead', 'Senior', 'Junior', 'Intern', 'Clerk', 'Executive', 'Consultant'];
const commonStopWordsInTitle = ['Nafasi ya Kazi', 'Omba Sasa', 'Job Opportunity', 'Apply Now'];

let isValidJobTitle = job.title && job.title.length > 3 && !commonStopWordsInTitle.some(word => job.title.toLowerCase().includes(word.toLowerCase()));
let isJobTitleRecognized = isValidJobTitle && validJobKeywords.some(keyword => job.title.toLowerCase().includes(keyword.toLowerCase()));

let isValidCompany = job.companyName && job.companyName.length > 2 && !commonStopWordsInTitle.some(word => job.companyName.toLowerCase().includes(word.toLowerCase()));

if (isJobTitleRecognized && isValidCompany) {
    result.push(job);
}