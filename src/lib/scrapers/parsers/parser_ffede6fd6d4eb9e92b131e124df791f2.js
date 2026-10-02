// Attempt to locate a JobPosting in JSON‑LD scripts
let jobData = null;
function searchJob(obj) {
    if (!obj) return null;
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const found = searchJob(item);
            if (found) return found;
        }
    } else if (typeof obj === 'object') {
        if (obj['@type'] === 'JobPosting') return obj;
        // some sites embed the job inside a @graph array
        if (obj['@graph']) {
            const found = searchJob(obj['@graph']);
            if (found) return found;
        }
        for (const key in obj) {
            const found = searchJob(obj[key]);
            if (found) return found;
        }
    }
    return null;
}
$('script[type="application/ld+json"]').each((_, el) => {
    if (jobData) return;
    try {
        const txt = $(el).contents().text().trim();
        if (!txt) return;
        const parsed = JSON.parse(txt);
        const found = searchJob(parsed);
        if (found) jobData = found;
    } catch (e) { /* ignore malformed JSON */ }
});

// Helper to normalise employment type strings
function normaliseJobType(type) {
    if (!type) return '';
    const map = {
        'full time': 'full_time',
        'full-time': 'full_time',
        'part time': 'part_time',
        'part-time': 'part_time',
        'contract': 'contract',
        'internship': 'internship',
        'intern': 'internship',
        'remote': 'remote',
        'temporary': 'contract'
    };
    const lowered = type.toString().toLowerCase().trim();
    return map[lowered] || lowered.replace(/\s+/g, '_');
}

// Build the job object either from JSON‑LD or from the DOM
let job = null;

if (jobData) {
    const jd = jobData;
    job = {
        title: jd.title || jd.name || '',
        companyName: (jd.hiringOrganization && jd.hiringOrganization.name) || '',
        description: jd.description || '',
        location: '',
        jobType: '',
        sourceUrl: jd.url || '',
        postedDateIsoString: jd.datePosted || '',
        deadlineIsoString: jd.validThrough || '',
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: ''
    };
    // Location (try common patterns)
    if (jd.jobLocation && jd.jobLocation.address) {
        const addr = jd.jobLocation.address;
        const parts = [
            addr.streetAddress,
            addr.addressLocality,
            addr.addressRegion,
            addr.postalCode,
            addr.addressCountry
        ].filter(Boolean);
        job.location = parts.join(', ');
    }
    // Employment type
    if (Array.isArray(jd.employmentType)) {
        job.jobType = normaliseJobType(jd.employmentType[0]);
    } else {
        job.jobType = normaliseJobType(jd.employmentType);
    }
    // Salary
    if (jd.baseSalary) {
        const bs = jd.baseSalary;
        if (typeof bs === 'object') {
            if (bs.value) {
                if (Array.isArray(bs.value)) {
                    // sometimes value is an array with min/max
                    const [min, max] = bs.value;
                    job.salaryMin = typeof min === 'number' ? min : null;
                    job.salaryMax = typeof max === 'number' ? max : null;
                } else if (typeof bs.value === 'object') {
                    job.salaryMin = typeof bs.value.minValue === 'number' ? bs.value.minValue : null;
                    job.salaryMax = typeof bs.value.maxValue === 'number' ? bs.value.maxValue : null;
                } else if (typeof bs.value === 'number') {
                    job.salaryMin = job.salaryMax = bs.value;
                }
            }
            job.salaryCurrency = bs.currency || '';
        } else if (typeof bs === 'string') {
            // attempt to parse a simple "USD 3000" string
            const parts = bs.trim().split(/\s+/);
            if (parts.length === 2 && !isNaN(parts[1])) {
                job.salaryCurrency = parts[0];
                job.salaryMin = job.salaryMax = Number(parts[1]);
            }
        }
    }
}

// Fallback to DOM extraction if JSON‑LD did not yield a title
if (!job || !job.title) {
    const titleSel = 'h1.entry-title, h1.single-job-title, .job-header h1, .job-title, .entry-title';
    const title = $(titleSel).first().text().trim();

    if (title) {
        job = {
            title,
            companyName: '',
            description: '',
            location: '',
            jobType: '',
            sourceUrl: '',
            postedDateIsoString: '',
            deadlineIsoString: '',
            salaryMin: null,
            salaryMax: null,
            salaryCurrency: ''
        };
        // company name (common selectors)
        const compSel = '.company-name, .employer, .job-company, .post-company';
        job.companyName = $(compSel).first().text().trim();

        // description – assume article or .job-description
        const descSel = '.job-description, .entry-content, article';
        job.description = $(descSel).first().text().trim();

        // location – look for icons or labels
        const locSel = '.job-location, .location, .job-meta .location';
        job.location = $(locSel).first().text().trim();

        // employment type – may be listed in a badge
        const typeSel = '.employment-type, .job-type, .job-meta .type';
        job.jobType = normaliseJobType($(typeSel).first().text());

        // source URL – use canonical link if present
        const canon = $('link[rel="canonical"]').attr('href') || '';
        job.sourceUrl = canon;

        // posted / deadline – look for date elements
        const postedSel = '.date-posted, .posted-date, time.posted';
        const posted = $(postedSel).first().attr('datetime') || $(postedSel).first().text().trim();
        job.postedDateIsoString = posted;

        const deadlineSel = '.deadline, .closing-date, time.deadline';
        const deadline = $(deadlineSel).first().attr('datetime') || $(deadlineSel).first().text().trim();
        job.deadlineIsoString = deadline;
    }
}

// If a valid job object with a title was assembled, push it to result
if (job && job.title) {
    result.push(job);
}