// Parse JSON‑LD for job listings
let seenUrls = new Set();
$('script[type="application/ld+json"]').each((_, script) => {
    try {
        const json = JSON.parse($(script).contents().first().text());
        const graphs = Array.isArray(json["@graph"]) ? json["@graph"] : [json];
        graphs.forEach(g => {
            if (g["@type"] === "SearchResultsPage" && g.mainEntity && g.mainEntity.itemListElement) {
                const items = Array.isArray(g.mainEntity.itemListElement) ? g.mainEntity.itemListElement : [g.mainEntity.itemListElement];
                items.forEach(li => {
                    const item = li.item || {};
                    const title = typeof item.name === "string" ? item.name.trim() : "";
                    const sourceUrl = typeof item.url === "string" ? item.url.trim() : "";
                    if (!title || !sourceUrl || seenUrls.has(sourceUrl)) return;
                    seenUrls.add(sourceUrl);
                    const job = { title, sourceUrl };
                    const atMatch = title.match(/at\s+([^,]+)/i);
                    if (atMatch) job.companyName = atMatch[1].trim();
                    result.push(job);
                });
            }
        });
    } catch (e) { /* ignore malformed JSON */ }
});
// Fallback: look for anchor links that appear to be job detail pages
if (result.length === 0) {
    $('a[href*="/jobs/view/"]').each((_, a) => {
        const href = $(a).attr('href');
        const text = $(a).text().trim();
        if (!href || !text) return;
        const url = href.startsWith('http') ? href : new URL(href, 'https://jobs.tz.cari.africa').href;
        if (seenUrls.has(url)) return;
        // Heuristic: title contains typical job keywords and length > 5
        if (text.split(' ').length < 2) return;
        seenUrls.add(url);
        const job = { title: text, sourceUrl: url };
        const atMatch = text.match(/at\s+([^,]+)/i);
        if (atMatch) job.companyName = atMatch[1].trim();
        result.push(job);
    });
}