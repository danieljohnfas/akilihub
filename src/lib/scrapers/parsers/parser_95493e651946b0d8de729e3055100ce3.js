const canonicalUrl = $('link[rel="canonical"]').attr('href') || '';
const ogTitle = $('meta[property="og:title"]').attr('content') || '';
const ogDescription = $('meta[property="og:description"]').attr('content') || '';
const publishedTime = $('meta[property="article:published_time"]').attr('content') || '';
const modifiedTime = $('meta[property="article:modified_time"]').attr('content') || '';

// Try to extract from JSON-LD JobPosting if exists
let jobPosting = null;
$('script[type="application/ld+json"]').each((i, el) => {
    try {
        const data = JSON.parse($(el).html());
        const graphs = data['@graph'] || [data];
        graphs.forEach(item => {
            if (item['@type'] === 'JobPosting') {
                jobPosting = item;
            }
        });
    } catch (e) {}
});

if (jobPosting) {
    const title = jobPosting.title || ogTitle;
    const companyName = jobPosting.hiringOrganization?.name || 'People\'s Bank of Zanzibar Limited (PBZ)';
    const description = jobPosting.description || ogDescription;
    const location = jobPosting.jobLocation?.address?.addressLocality || 'Zanzibar';
    const jobType = jobPosting.employmentType || 'full_time';
    const sourceUrl = jobPosting.url || canonicalUrl;
    const postedDate = jobPosting.datePosted || publishedTime;
    const deadline = jobPosting.validThrough || null;
    const salaryMin = jobPosting.baseSalary?.value?.minValue ? parseFloat(jobPosting.baseSalary.value.minValue) : null;
    const salaryMax = jobPosting.baseSalary?.value?.maxValue ? parseFloat(jobPosting.baseSalary.value.maxValue) : null;
    const salaryCurrency = jobPosting.baseSalary?.value?.currency || null;

    result.push({
        title,
        companyName,
        description,
        location,
        jobType,
        sourceUrl,
        postedDateIsoString: postedDate,
        deadlineIsoString: deadline,
        salaryMin,
        salaryMax,
        salaryCurrency
    });
} else {
    // Fallback: extract from page content
    // This page appears to be a single job article about PBZ Sales Officer vacancies
    const title = ogTitle.replace('PBZ Sales Officer Vacancies 2026: 26 Posts Available in Zanzibar', 'Sales Officer').trim();
    const companyName = 'People\'s Bank of Zanzibar Limited (PBZ)';
    const description = ogDescription;
    const location = 'Zanzibar';
    const jobType = 'full_time';
    const sourceUrl = canonicalUrl;
    const postedDate = publishedTime;
    const deadline = null; // Not found in HTML

    // Only push if we have a clear job title and company
    if (title && companyName) {
        result.push({
            title: 'Sales Officer',
            companyName,
            description,
            location,
            jobType,
            sourceUrl,
            postedDateIsoString: postedDate,
            deadlineIsoString: deadline,
            salaryMin: null,
            salaryMax: null,
            salaryCurrency: null
        });
    }
}