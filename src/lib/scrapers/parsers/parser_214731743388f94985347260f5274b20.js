const article = $('article, .post-content, .entry-content, main').first();
if (article.length) {
    const text = article.text();
    if (/nafasi za kazi|job vacancies|vacancies/i.test(text)) {
        // This is a generic article about vacancies, not individual job postings
        // Do not extract
    }
}
// No structured job listing containers found in this article page
// result remains empty