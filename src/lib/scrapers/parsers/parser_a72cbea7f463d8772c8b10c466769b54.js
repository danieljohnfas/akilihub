let jobContainers = $('p');
for (let i = 0; i < jobContainers.length; i++) {
    let container = jobContainers[i];
    let text = $(container).text();
    let regex = /\d+\.\s*(.*)\s*-\s*(.*)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        let jobTitle = match[1];
        let jobType = 'full_time';
        let companyName = 'Zanzibar University';
        let location = 'Tunguu, Zanzibar';
        let description = text;
        let sourceUrl = $('meta[property="og:url"]').attr('content');
        let postedDateIsoString = $('meta[property="article:published_time"]').attr('content');
        let deadlineIsoString = '2026-09-15T00:00:00+00:00';
        let salaryMin = null;
        let salaryMax = null;
        let salaryCurrency = null;
        result.push({
            title: jobTitle,
            companyName: companyName,
            description: description,
            location: location,
            jobType: jobType,
            sourceUrl: sourceUrl,
            postedDateIsoString: postedDateIsoString