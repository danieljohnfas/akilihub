result = [];
const jobList = $('script[type="application/ld+json"]').text();
const jsonData = JSON.parse(jobList);

if (jsonData['@graph'] && jsonData['@graph'][1] && jsonData['@graph'][1]['mainEntity'] && jsonData['@graph'][1]['mainEntity']['itemListElement']) {
    jsonData['@graph'][1]['mainEntity']['itemListElement'].forEach((item, index) => {
        const job = {
            title: item.item.name,
            companyName: null, // Not available in the provided HTML
            description: null, // Not available in the provided HTML
            location: null, // Not available in the provided HTML
            jobType: null, // Not available in the provided HTML
            sourceUrl: item.item.url,
            postedDateIsoString: null, // Not available in the provided HTML
            deadlineIsoString: null, // Not available in the provided HTML
            salaryMin: null, // Not available in the provided HTML
            salaryMax: null, // Not available in the provided HTML
            salaryCurrency: null // Not available in the provided HTML
        };
        result.push(job);
    });
}