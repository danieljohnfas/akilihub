const jsonScript = $('script[type="application/ld+json"]');
let jsonData = null;
jsonScript.each(function () {
    try {
        const data = JSON.parse($(this).text());
        if (data && data['@type'] === 'ItemList' && Array.isArray(data.itemListElement)) {
            jsonData = data;
            return false;
        }
    } catch (e) {}
});
if (!jsonData) {
    // result remains empty
} else {
    const items = jsonData.itemListElement.filter(i => i['@type'] === 'ListItem');
    items.forEach(item => {
        const title = item.name ? item.name.trim() : '';
        const url = item.url ? item.url.trim() : '';
        const location = 'Dar es Salaam, Tanzania';
        result.push({
            title,
            companyName: null,
            description: null,
            location,
            jobType: null,
            sourceUrl: url,
            postedDateIsoString: null,
            deadlineIsoString: null,
            salaryMin: null,
            salaryMax: null,
            salaryCurrency: null
        });
    });
}