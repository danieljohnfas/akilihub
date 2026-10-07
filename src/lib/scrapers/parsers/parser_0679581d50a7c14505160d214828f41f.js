var job = {};

var pageTitle = $('h3.post-title.entry-title').text().trim();
var metaDescription = $('meta[name="description"]').attr('content');
var ogTitle = $('meta[property="og:title"]').attr('content');
var ogUrl = $('meta[property="og:url"]').attr('content');
var canonicalUrl = $('link[rel="canonical"]').attr('href');

// Check if it's a job posting page
if (pageTitle.toLowerCase().includes('job') || (ogTitle && ogTitle.toLowerCase().includes('job'))) {

    // Title
    job.title = null;
    if (pageTitle) {
        var titleParts = pageTitle.split('–').map(s => s.trim());
        if (titleParts.length > 0) {
            job.title = titleParts[0].replace(/Job \d{4}$/g, '').trim(); // Remove "Job YYYY" if present
            if (job.title.toLowerCase().startsWith('msf ')) {
                job.title = job.title.substring(4).trim(); // Remove "MSF " prefix
            }
        }
    }
    // Fallback if title parsing failed or was too aggressive
    if (!job.title && ogTitle) {
        var ogTitleParts = ogTitle.split('–').map(s => s.trim());
        job.title = ogTitleParts[0].replace(/Job \d{4}$/g, '').trim();
        if (job.title.toLowerCase().startsWith('msf ')) {
            job.title = job.title.substring(4).trim();
        }
    }

    // Company Name
    job.companyName = null;
    if (pageTitle) {
        var titleParts = pageTitle.split('–').map(s => s.trim());
        if (titleParts.length > 1) {
            job.companyName = titleParts[1];
        } else if (ogTitle) {
            var ogTitleParts = ogTitle.split('–').map(s => s.trim());
            if (ogTitleParts.length > 1) {
                job.companyName = ogTitleParts[1];
            }
        }
    }

    // Description
    var descriptionElement = $('div.post-body.entry-content');
    if (descriptionElement.length) {
        // Remove script and style tags from description
        descriptionElement.find('script, style').remove();
        job.description = descriptionElement.text().trim().replace(/\s\s+/g, ' ');
    } else {
        job.description = metaDescription || null;
    }

    // Location
    job.location = null;
    if (metaDescription && metaDescription.includes('in Tanzania')) {
        job.location = 'Tanzania';
    } else if (job.companyName && job.companyName.includes('Tanzania')) {
        job.location = 'Tanzania';
    }

    // Source URL
    job.sourceUrl = canonicalUrl || ogUrl || null;

    // Job Type, Posted Date, Deadline, Salary: Not explicitly available in this HTML structure
    job.jobType = null;
    job.postedDateIsoString = null;
    job.deadlineIsoString = null;
    job.salaryMin = null;
    job.salaryMax = null;
    job.salaryCurrency = null;

    // Push the job object to the result array
    // Ensure title and companyName are present as primary indicators of a valid job
    if (job.title && job.companyName) {
        result.push(job);
    }
}