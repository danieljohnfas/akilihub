var $containers = $('.job, .vacancy, .career, .position, .job-listing, .job-item, .job-card, .job-posting');
if ($containers.length > 0) {
    $containers.each(function () {
        var $c = $(this);
        var $titleEl = $c.find('h1, h2, h3, .title, .job-title').first();
        var title = $titleEl.text().trim();
        if (!title) return;
        var $companyEl = $c.find('.company, .company-name, .org, .employer').first();
        var companyName = $companyEl.text().trim();
        var $descEl = $c.find('.description, .desc, .details, p').first();
        var description = $descEl.text().trim();
        var $locationEl = $c.find('.location, .loc, .location-item').first();
        var location = $locationEl.text().trim();
        var jobType = 'full_time';
        var $typeEl = $c.find('.job-type, .type, .category').first();
        if ($typeEl.length) {
            var t = $typeEl.text().trim().toLowerCase();
            if (t.includes('part')) jobType = 'part_time';
            else if (t.includes('contract')) jobType = 'contract';
            else if (t.includes('intern')) jobType = 'internship';
            else if (t.includes('remote')) jobType = 'remote';
        }
        var $linkEl = $c.find('a').first();
        var sourceUrl = $linkEl ? ($linkEl.attr('href') ? ($linkEl.attr('href').startsWith('http') ? $linkEl.attr('href') : 'https://kcbgroup.com' + $linkEl.attr('href')) : '') : '';
        var postedDateIso = '';
        var $postedEl = $c.find('.posted-date, .date-posted, time').first();
        if ($postedEl.length) {
            var dt = $postedEl.attr('datetime') || $postedEl.text().trim();
            var d = new Date(dt);
            if (!isNaN(d)) postedDateIso = d.toISOString();
        }
        var deadlineIso = '';
        var $deadlineEl = $c.find('.deadline, .closing-date, time').first();
        if ($deadlineEl.length) {
            var dt = $deadlineEl.attr('datetime') || $deadlineEl.text().trim();
            var d = new Date(dt);
            if (!isNaN(d)) deadlineIso = d.toISOString();
        }
        var salaryMin = null;
        var salaryMax = null;
        var salaryCurrency = '';
        var $salaryEl = $c.find('.salary, .pay, .compensation, .compensation-item').first();
        if ($salaryEl.length) {
            var txt = $salaryEl.text().trim();
            var m = txt.match(/(\d+(?:\.\d+)?)\s*([A-Z]{3})?/i);
            if (m) {
                salaryCurrency = m[2] || 'USD';
                salaryMin = parseFloat(m[1]);
                var range = txt.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/i);
                if (range) {
                    salaryMin = parseFloat(range[1]);
                    salaryMax = parseFloat(range[2]);
                }
            }
        }
        var job = {
            title: title,
            companyName: companyName,
            description: description,
            location: location,
            jobType: jobType,
            sourceUrl: sourceUrl,
            postedDateIsoString: postedDateIso,
            deadlineIsoString: deadlineIso,
            salaryMin: salaryMin,
            salaryMax: salaryMax,
            salaryCurrency: salaryCurrency
        };
        result.push(job);
    });
}