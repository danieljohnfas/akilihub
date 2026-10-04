(function() {
    // Helper to safely extract text
    var getText = function($el) {
        return $el ? $el.text().trim() : '';
    };

    var cleanText = function(text) {
        return text.replace(/\s+/g, ' ').trim();
    };

    var jobs = $(this).find('.job, .job-listing, .vacancy, .job-item, .job-card, .listing, .job-details, [data-job-id], [data-vacancy-id], .job-posting, .opening, .position, .job-board, .job-search-result, .vacancy-list, [class*="job-"], [class*="vacancy-"], [class*="opening-"], [class*="position-"], [class*="listing-"], [class*="jobcard"], .job-grid, .job-list-grid, .job-wrapper, .job-container, .job-entry, .job-block, .job-box, .job-offering');

    var hasRealJobContainers = jobs.length > 0;

    // Determine page type from structure and schema
    var isArticle = $('article[role="article"]').length > 0 || $('article').length > 0;
    var isJobDirectory = $('main').find('.company, .company-card, .organization, [class*="company-"]').length > 0;
    var hasSchemaGraph = $('script[type="application/ld+json"][class*="yoast-schema-graph"]').length > 0;

    if (!hasRealJobContainers || isArticle) {
        // Page is an article/general content page, not a structured list of individual job postings.
        // Per instructions, leave the result array empty.
        result = [];
        return;
    }

    // Process each job container
    jobs.each(function() {
        var jobEl = $(this);
        var $title = null;

        if (jobEl.is('a')) {
            $title = jobEl;
        } else {
            $title = jobEl.find('h1').add(jobEl.find('h2')).add(jobEl.find('h3')).add(jobEl.find('h4'))
                         .filter(function() {
                             var txt = getText($(this)).toLowerCase();
                             return txt.length > 3 && !/category|all jobs|recent|recent jobs|latest jobs|recently|latest|view all/i.test(txt);
                         }).first();
        }

        if (!$title || $title.length === 0) {
            return;
        }

        var title = cleanText($title.text());
        if (!title || title.length < 3) {
            return;
        }

        var companyName = '';
        var location = '';
        var jobType = '';
        var postedDate = '';
        var deadlineDate = '';

        // Find company name near the title (preceding/parent elements)
        var $nameEl = $title.prevAll().find('a[href]').first();
        var $orgEl = jobEl.find('.company, .organization, .employer, .company-name, .org-name, .school-name, .agency, [class*="company-"], [class*="org-"], [class*="employer-"], [class*="school-"], [class*="agency-'], .employer-name, .organization-name').first();
        if ($orgEl.length && $orgEl.text().trim().length > 0) {
            companyName = cleanText($orgEl.text());
        } else if ($nameEl.length && $nameEl.text().trim().length > 0) {
            companyName = cleanText($nameEl.text());
        }

        // Location
        var $locEl = jobEl.find('[class*="location"], [class*="place"], [class*="address"], .location, .place, .address, [data-location], [data-place], [data-address], .location-text, .location-name').first();
        if ($locEl.length) {
            location = cleanText($locEl.text());
        } else {
            var locMatch = title.match(/(?:location|place|in|at)\s*([^,]{2,60})/i);
            if (locMatch) {
                location = cleanText(locMatch[1]);
            }
        }
        location = location.replace(/^in |^at /i, '');
        location = location.replace(/[.,]$/, '');

        // Job type (from title or text)
        var lowerTitle = title.toLowerCase();
        if (/(full|regular|permanent)\s*(time|term)?\b/i.test(lowerTitle) && !/(contract|part|temp)/i.test(lowerTitle)) {
            jobType = 'full_time';
        } else if (/part\s*(time|term)?\b/i.test(lowerTitle)) {
            jobType = 'part_time';
        } else if (/contract/i.test(lowerTitle) && !/(temporary|temp|contractor)/i.test(lowerTitle)) {
            jobType = 'contract';
        } else if (/intern/i.test(lowerTitle)) {
            jobType = 'internship';
        } else if (/remote|work from home|telecommut/i.test(lowerTitle)) {
            jobType = 'remote';
        } else {
            jobType = 'full_time';
        }

        // Source URL
        var sourceUrl = $title.attr('href') || jobEl.find('a[href]').first().attr('href') || '';
        if (!sourceUrl) {
            var $parentLink = jobEl.closest('a[href]').attr('href');
            if ($parentLink) sourceUrl = $parentLink;
        }

        // Description (extract from the article body, since this is an article page)
        var description = '';
        var $main = $('article').find('.entry-content, .post-content, .the-content, [itemprop="articleBody"], [itemprop="description"], .entry-body, .content-body, .post-body, .article-body');
        if ($main.length) {
            description = cleanText($main.text());
        } else {
            var $article = $('article, .article, .post, .job-content, .job-description, .listing-content').first();
            if ($article.length) {
                description = cleanText($article.text());
            }
        }

        // Dates
        var $dateEl = jobEl.find('[class*="date"], .date, .published, .posted, [data-date], [data-published], [data-posted], time, .date-posted, .post-date, .listing-date').first();
        if ($dateEl.length) {
            var dateStr = cleanText($dateEl.text());
            var parsed = Date.parse(dateStr);
            if (!isNaN(parsed)) {
                postedDate = new Date(parsed).toISOString();
            } else {
                postedDate = dateStr;
            }
        }

        // Salary
        var salaryMin = null;
        var salaryMax = null;
        var salaryCurrency = '';
        var salMatch = lowerTitle.match(/(sh|us\$|\$\s*\d+|tsh|tzs)\s*(\d[\d,]*(?:\.\d+)?)\s*-*\s*(sh|us\$|\$\s*\d+|tsh|tzs|to)\s*(\d[\d,]*(?:\.\d+)?)?/i) ||
                       lowerTitle.match(/(?:salary|per)\s*(?:month|annum|monthly|yearly|annual)?\s*(sh|us\$|\$\s*\d+|tsh|tzs)\s*(\d[\d,]*(?:\.\d+)?)\s*-*\s*(to|-)?\s*(sh|us\$|\$\s*\d+|tsh|tzs)\s*(\d[\d,]*(?:\.\d+)?)?/i);
        if (salMatch) {
            if (salMatch[1] || salMatch[4]) salaryCurrency = 'TZS';
            if (salMatch[2]) salaryMin = parseFloat(salMatch[2].replace(/,/g, ''));
            if (salMatch[6]) salaryMax = parseFloat(salMatch[6].replace(/,/g, ''));
        }

        var deadlineText = cleanText(jobEl.find('[class*="deadline"], .deadline, [data-deadline], [class*="close"], [data-close], [class*="ending"], [data-ending]').first().text());
        if (deadlineText) {
            var dlParsed = Date.parse(deadlineText);
            deadlineDate = isNaN(dlParsed) ? deadlineText : new Date(dlParsed).toISOString();
        }

        result.push({
            title: title,
            companyName: companyName,
            description: description,
            location: location,
            jobType: jobType,
            sourceUrl: sourceUrl,
            postedDateIsoString: postedDate,
            deadlineIsoString: deadlineDate,
            salaryMin: salaryMin,
            salaryMax: salaryMax,
            salaryCurrency: salaryCurrency
        });
    });

    // If no valid job containers were found, ensure the array is empty
    if (result.length === 0 && !hasRealJobContainers) {
        result = [];
    }
})();