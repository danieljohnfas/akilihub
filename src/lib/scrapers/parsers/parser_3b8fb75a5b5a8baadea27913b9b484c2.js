const sourceUrl = $('head > link[rel="canonical"]').attr('href') || '';

function txt($el) {
    if (!$el.length) return '';
    return $.trim($el.text()).replace(/\s+/g, ' ');
}

let jobs = [];

// Priority 1: JSON-LD structured JobPosting data
$('script[type="application/ld+json"]').each(function() {
    try {
        const data = JSON.parse($(this).text());
        if (!data) return;
        const list = Array.isArray(data['@graph']) ? data['@graph'] : [data];
        jobs = jobs.concat(
            list.filter(function(x) {
                return x['@type'] === 'JobPosting' && x.title;
            })
        );
    } catch (e) {}
});

// Priority 2: parse article body (Angazetu single job post format)
if (jobs.length === 0) {
    const $article = $('article').first();
    if ($article.length) {
        let title = txt($article.find('h1').first());
        if (!title) {
            title = txt($('head > title').first());
        }
        if (title) {
            title = title.replace(/ - Angazetu\s*$/, '').trim();
            title = title.replace(/ - [A-Za-z]{2,}\s*$/, '').trim();
        }

        if (title) {
            let companyName = '';
            const atIdx = title.search(/ at /i);
            if (atIdx > -1) {
                companyName = title.substring(atIdx + 4).trim();
            }

            const $content = $article.find('.wp-block-post-content, .entry-content, .job-content, main').first();
            const body = $content.length ? txt($content) : txt($article);

            let description = body;
            if (title) {
                description = description.replace(title, '');
            }
            if (companyName) {
                description = description.replace(companyName, '');
            }
            description = $.trim(description).replace(/\s+/g, ' ');

            let location = '';
            const locMatch = body.match(/(?:located in|in|location)[:\s]+([A-Za-z\s,]{3,40})/i);
            if (locMatch) {
                location = $.trim(locMatch[1]);
            }

            let deadline = '';
            const dlMatch = body.match(/(?:apply by|application deadline|deadline)[:\s]+([A-Za-z0-9\s,]{3,40})/i);
            if (dlMatch) {
                deadline = $.trim(dlMatch[1]);
            }

            let jobType = '';
            const typeMatch = body.match(/(full[- ]time|part[- ]time|contract|internship|temporary|permanent)/i);
            if (typeMatch) {
                const raw = typeMatch[1].toLowerCase().replace(/ /g, '_');
                if (raw === 'full_time') jobType = 'full_time';
                else if (raw === 'part_time') jobType = 'part_time';
                else if (raw === 'contract') jobType = 'contract';
                else if (raw === 'internship') jobType = 'internship';
                else if (raw === 'permanent' || raw === 'temporary') jobType = 'full_time';
            }

            let salaryMin = null;
            let salaryMax = null;
            let salaryCurrency = 'KES';
            const salMatch = body.match(/([Kk][Ss]|KES|Ksh|Shs?)?\s*([^a-zA-Z0-9]{0,10})?([\d,]+)\s*[-–—]\s*([\d,]+)/);
            if (salMatch) {
                salaryMin = parseFloat(salMatch[3].replace(/,/g, ''));
                salaryMax = parseFloat(salMatch[4].replace(/,/g, ''));
                if (salMatch[1]) {
                    const c = salMatch[1].toUpperCase();
                    salaryCurrency = (c === 'SHS' || c === 'KES' || c === 'KSH' || c === 'KSHS') ? 'KES' : c;
                }
            }

            let postedDate = '';
            const pub = $('meta[property="article:published_time"]').attr('content');
            if (pub) {
                postedDate = pub;
            } else {
                const pub2 = $article.find('[itemprop="datePublished"]').attr('content');
                if (pub2) postedDate = pub2;
            }

            jobs.push({
                title: title,
                companyName: companyName,
                description: description,
                location: location,
                jobType: jobType,
                sourceUrl: sourceUrl,
                postedDateIsoString: postedDate,
                deadlineIsoString: deadline,
                salaryMin: salaryMin,
                salaryMax: salaryMax,
                salaryCurrency: salaryCurrency
            });
        }
    }
}

// Deduplicate by title and push to result
const seenTitles = new Set();
jobs.forEach(function(j) {
    const t = (j.title || '').trim();
    if (!t || seenTitles.has(t)) {
        return;
    }
    seenTitles.add(t);
    result.push({
        title: t,
        companyName: j.companyName || '',
        description: j.description || '',
        location: j.location || '',
        jobType: j.jobType || '',
        sourceUrl: j.sourceUrl || '',
        postedDateIsoString: j.postedDateIsoString || '',
        deadlineIsoString: j.deadlineIsoString || '',
        salaryMin: typeof j.salaryMin === 'number' ? j.salaryMin : null,
        salaryMax: typeof j.salaryMax === 'number' ? j.salaryMax : null,
        salaryCurrency: j.salaryCurrency || ''
    });
});