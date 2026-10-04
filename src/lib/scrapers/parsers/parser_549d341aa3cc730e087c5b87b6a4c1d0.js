var job = {
    title: '',
    companyName: '',
    description: '',
    location: '',
    jobType: null,
    sourceUrl: '',
    postedDateIsoString: '',
    deadlineIsoString: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null
};

var $title = $('.entry-title, h1, h2').first();
if ($title.length) {
    job.title = $title.text().trim();
} else {
    var $article = $('article').first();
    if ($article.length) {
        var $h = $article.find('h1, h2').first();
        if ($h.length) job.title = $h.text().trim();
    }
}

var $company = $('.author, .company, .org, .vcard, .byline').first();
if ($company.length) {
    job.companyName = $company.text().trim();
}

var $desc = $('.entry-content, .article-body, .post-content, .content').first();
if ($desc.length) {
    job.description = $desc.text().trim();
}

var $location = $('.location, .job-location, .place, .city, .address').first();
if ($location.length) {
    job.location = $location.text().trim();
}

var $type = $('.employment-type, .job-type, .type, .posted-on').first();
if ($type.length) {
    var t = $type.text().trim().toLowerCase();
    if (t.includes('full')) job.jobType = 'full_time';
    else if (t.includes('part')) job.jobType = 'part_time';
    else if (t.includes('contract')) job.jobType = 'contract';
    else if (t.includes('intern')) job.jobType = 'internship';
    else if (t.includes('remote')) job.jobType = 'remote';
}

var $source = $('link[rel="canonical"]').first();
if ($source.length) {
    job.sourceUrl = $source.attr('href');
}

var $pubDate = $('meta[property="article:published_time"]').first();
if ($pubDate.length) {
    job.postedDateIsoString = $pubDate.attr('content');
}

var $dead = $('meta[property="article:modified_time"], meta[property="article:deadline"]').first();
if ($dead.length) {
    job.deadlineIsoString = $dead.attr('content');
}

var $salary = $('.salary, .compensation, .pay, .remuneration').first();
if ($salary.length) {
    var txt = $salary.text().trim();
    var m = txt.match(/([\d.,]+)\s*[-–]\s*([\d.,]+)\s*([A-Za-z]+)/);
    if (m) {
        job.salaryMin = parseFloat(m[1].replace(/,/g, ''));
        job.salaryMax = parseFloat(m[2].replace(/,/g, ''));
        job.salaryCurrency = m[3];
    }
}

if (job.title) {
    result.push(job);
}