// No job listings found in the provided HTML structure
// The HTML appears to be a navigation/menu structure without actual job postings

// Check if there are any job containers in the HTML
const jobContainers = $('div[class*="job"], div[class*="career"], div[class*="position"], .job-listing, .career-listing');

if (jobContainers.length === 0) {
    // No job containers found, leave result empty
} else {
    // Process job containers if they exist
    jobContainers.each(function() {
        const $el = $(this);
        
        // Try to extract job information
        const title = $el.find('h1, h2, h3, h4, .job-title, .position-title').first().text().trim();
        
        if (title) {
            const companyName = $el.find('.company, .company-name, .employer').first().text().trim();
            const description = $el.find('.description, .job-description, .summary').first().text().trim();
            const location = $el.find('.location, .job-location').first().text().trim();
            const jobType = $el.find('.job-type, .employment-type').first().text().trim();
            const sourceUrl = $el.find('a').first().attr('href') || '';
            const postedDate = $el.find('.posted-date, .date-posted').first().text().trim();
            
            // Only push if we have a valid job title
            result.push({
                title: title,
                companyName: companyName || '',
                description: description || '',
                location: location || '',
                jobType: jobType || '',
                sourceUrl: sourceUrl,
                postedDateIsoString: postedDate || ''
            });
        }
    });
}