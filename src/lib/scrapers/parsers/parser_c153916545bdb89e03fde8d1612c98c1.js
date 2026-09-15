// Extract basic metadata
var title = ($('meta[property="og:title"]').attr('content') || $('title').text()).trim();
if (!title) {
    // No clear job title, leave result empty
} else {
    var description = ($('article').text() || $('.post-content').text() || '').trim();

    // source URL
    var sourceUrl = $('meta[property="og:url"]').attr('content') || '';

    // posted date (ISO) if available
    var postedDateIsoString = ($('meta[property="article:published_time"]').attr('content') || '').trim();

    // Attempt to extract deadline date from description (e.g., "before 14 September 2026")
    var deadlineIsoString = '';
    var deadlineMatch = description.match(/before\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
    if (deadlineMatch) {
        var d = new Date(deadlineMatch[1]);
        if (!isNaN(d)) {
            deadlineIsoString = d.toISOString();
        }
    }

    // Attempt to infer company name and location from the title
    var companyName = '';
    var location = '';

    // Company: look for "at <Company>" pattern
    var companyMatch = title.match(/at\s+([^\d]+?)(?:\s+in|\s+at|\s+[A-Z][a-z]+|\s+\d{4}|$)/i);
    if (companyMatch) {
        companyName = companyMatch[1].trim();
    }

    // Location: look for "in <Location>" or ending part of title after company
    var locMatch = title.match(/in\s+([A-Za-z\s]+?)(?:\s+\d{4}|$)/i);
    if (locMatch) {
        location = locMatch[1].trim();
    } else {
        // fallback: try to capture last capitalized word(s) before year
        var locFallback = title.match(/([A-Za-z\s]+)\s+\d{4}$/);
        if (locFallback) {
            location = locFallback[1].trim();
        }
    }

    // Job type mapping (simple keyword detection)
    var jobType = '';
    var lowerDesc = description.toLowerCase();
    if (/\bfull[-\s]?time\b/.test(lowerDesc)) jobType = 'full_time';
    else if (/\bpart[-\s]?time\b/.test(lowerDesc)) jobType = 'part_time';
    else if (/\bcontract\b/.test(lowerDesc)) jobType = 'contract';
    else if (/\binternship\b/.test(lowerDesc)) jobType = 'internship';
    else if (/\bremote\b/.test(lowerDesc)) jobType = 'remote';

    // Salary extraction (very basic)
    var salaryMin = null, salaryMax = null, salaryCurrency = null;
    var salaryMatch = description.match(/([\$€£])\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/);
    if (salaryMatch) {
        salaryCurrency = salaryMatch[1];
        var amount = parseFloat(salaryMatch[2].replace(/,/g, ''));
        salaryMin = amount;
        salaryMax = amount;
    }

    // Assemble job object
    var job = {
        title: title,
        companyName: companyName || undefined,
        description: description || undefined,
        location: location || undefined,
        jobType: jobType || undefined,
        sourceUrl: sourceUrl || undefined,
        postedDateIsoString: postedDateIsoString || undefined,
        deadlineIsoString: deadlineIsoString || undefined,
        salaryMin: salaryMin !== null ? salaryMin : undefined,
        salaryMax: salaryMax !== null ? salaryMax : undefined,
        salaryCurrency: salaryCurrency || undefined
    };

    result.push(job);
}