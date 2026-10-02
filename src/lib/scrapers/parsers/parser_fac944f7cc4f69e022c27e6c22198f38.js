// Extract job details from the HTML
const job = {};

// Extract title from og:title meta tag
const titleElement = $('meta[property="og:title"]');
if (titleElement.length) {
    job.title = titleElement.attr('content').trim();
}

// Extract company name - look for common patterns in the HTML
// Since company name isn't explicitly in meta tags, we'll leave it empty
// or could try to extract from other elements if available

// Extract source URL from og:url meta tag
const urlElement = $('meta[property="og:url"]');
if (urlElement.length) {
    job.sourceUrl = urlElement.attr('content').trim();
}

// Extract description from meta description or og:description
const descElement = $('meta[name="description"], meta[property="og:description"]');
if (descElement.length) {
    job.description = descElement.attr('content').trim();
}

// Extract location from title pattern "Job Title - Location"
if (job.title && job.title.includes(' - ')) {
    const parts = job.title.split(' - ');
    job.location = parts[parts.length - 1].trim();
    // Clean up the title to remove location part
    job.title = parts.slice(0, -1).join(' - ').trim();
}

// Try to extract job type from title or description
if (job.title) {
    const titleLower = job.title.toLowerCase();
    if (titleLower.includes('sales representative') || titleLower.includes('sales')) {
        job.jobType = 'full_time';
    }
}

// Only push to result if we have a clear job title
if (job.title && job.title.length > 0) {
    result.push(job);
}