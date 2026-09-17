const companyName = $('title').text().replace('Careers – ', '').replace(' | Dangote Industries Limited', '').trim();

$('.elementor-toggle-item').each((index, element) => {
    const $item = $(element);

    const job = {};

    // Title
    job.title = $item.find('.elementor-toggle-item-title span').text().trim() || null;

    // CRITICAL: Only extract actual job listings with a clear job title.
    if (!job.title) {
        return; // Skip this item if no title
    }

    // Company Name
    job.companyName = companyName;

    const $content = $item.find('.elementor-toggle-item-content');

    // Location
    const locationParagraph = $content.find('p strong:contains("Location:")').parent().text();
    job.location = locationParagraph.includes('Location:') ? locationParagraph.split('Location:')[1].trim() : null;

    // Job Type
    let jobTypeParagraph = $content.find('p strong:contains("Job Type:")').parent().text();
    if (jobTypeParagraph.includes('Job Type:')) {
        let extractedJobType = jobTypeParagraph.split('Job Type:')[1].trim();
        switch (extractedJobType) {
            case 'Full Time':
                job.jobType = 'full_time';
                break;
            case 'Part Time':
                job.jobType = 'part_time';
                break;
            case 'Contract':
                job.jobType = 'contract';
                break;
            case 'Internship':
                job.jobType = 'internship';
                break;
            case 'Remote':
                job.jobType = 'remote';
                break;
            default:
                job.jobType = null;
        }
    } else {
        job.jobType = null;
    }

    // Source URL
    job.sourceUrl = $content.find('.elementor-button-link').attr('href') || null;

    // Description
    const $descriptionContent = $content.clone();
    // Remove known elements that are not part of the core description
    $descriptionContent.find('p:contains("Location:")').remove();
    $descriptionContent.find('p:contains("Job Type:")').remove();
    $descriptionContent.find('p:contains("Department:")').remove();
    $descriptionContent.find('.elementor-widget-button').remove(); // Remove the apply button section

    // Get cleaned text for description. Replace multiple newlines/spaces with a single space.
    job.description = $descriptionContent.text().replace(/\s+/g, ' ').trim() || null;

    // Set other fields to null as they are not found in the provided HTML structure
    job.postedDateIsoString = null;
    job.deadlineIsoString = null;
    job.salaryMin = null;
    job.salaryMax = null;
    job.salaryCurrency = null;

    result.push(job);
});