let jsonScript = $("script[type='application/ld+json']").first();
if (jsonScript.length) {
    let jsonData = JSON.parse(jsonScript.text());
    jsonData["@graph"].forEach(section => {
        if (section["@type"] === "SearchResultsPage") {
            let items = section.mainEntity?.itemListElement;
            if (items) {
                items.forEach(item => {
                    let job = {};
                    job.title = item.item?.name || null;
                    job.sourceUrl = item.item?.url || null;
                    job.companyName = null;
                    job.description = null;
                    job.location = null;
                    job.jobType = null;
                    job.postedDateIsoString = null;
                    job.deadlineIsoString = null;
                    job.salaryMin = null;
                    job.salaryMax = null;
                    job.salaryCurrency = null;
                    if (job.title) {
                        result.push(job);
                    }
                });
            }
        }
    });
}