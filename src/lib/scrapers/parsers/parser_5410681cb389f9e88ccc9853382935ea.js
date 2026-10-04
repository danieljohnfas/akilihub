let selectors = ['article.job', '.job-card', '.job-listing', '.job-details', '[data-job-id]', 'li.job', 'a.job', 'div.job-post'];
let seen = {};
selectors.forEach(function(sel) {
  let elements = $(sel);
  elements.each(function() {
    let el = $(this);
    let key = el.prop('id') || (el.attr('class') || '').replace(/\s+/g, '-');
    if (seen[key]) return;
    seen[key] = true;
    let title = el.find('h1.job-title, h2.job-title, h3.job-title, h4.job-title, .job-title, h1, h2, h3, .title').filter(function() {
      return $(this).text().trim().length > 0;
    }).eq(0).text().trim();
    if (!title || title.length < 3) return;
    let company = el.find('.company-name, .company, .employer, .company a, .org-name').eq(0).text().trim();
    let location = el.find('.location, .job-location, .where, .address, .location a').eq(0).text().trim();
    let jobType = el.find('.job-type, .type, .job-type a, .employment-type').eq(0).text().trim();
    let description = el.find('.job-description, .description, .job-content, .job-summary, .content').eq(0).text().trim();
    let url = el.find('a').eq(0).attr('href');
    if (url && (url.indexOf('feed') > -1 || url.indexOf('comment') > -1 || url.indexOf('login') > -1)) url = null;
    if (!url) url = '';
    result.push({
      title: title,
      companyName: company,
      description: description,
      location: location,
      jobType: jobType,
      sourceUrl: url
    });
  });
});