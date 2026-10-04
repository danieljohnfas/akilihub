var postedDate=$('meta[property="article:published_time"]').attr('content')||null;
var pageUrl=$('link[rel="canonical"]').attr('href')||null;
var jobContainers=$('article .job-item, article .vacancy-item, article .listing-item, article li, .post .job-item, .post .vacancy-item, .post .listing-item, .post li').filter(function(){return $(this).find('a, h1, h2, h3').length>0;});
if(jobContainers.length===0){jobContainers=$('article tr, .post tr').filter(function(){return $(this).find('a, h1, h2, h3').length>0;});}
jobContainers.each(function(){
    var $c=$(this);
    var title=$c.find('a, h1, h2, h3').first().text().trim();
    if(!title){return;}
    var link=$c.find('a').first().attr('href')||pageUrl;
    var description=$c.find('p').first().text().trim()||null;
    var fullText=$c.text();
    var locationMatch=fullText.match(/Location[:\s]*([^\n,|]+)/i);
    var location=locationMatch?locationMatch[1].trim():null;
    var type=null;
    if(/full[-\s]?time/i.test(fullText)){type='full_time';}
    else if(/part[-\s]?time/i.test(fullText)){type='part_time';}
    else if(/contract/i.test(fullText)){type='contract';}
    else if(/internship/i.test(fullText)){type='internship';}
    else if(/remote/i.test(fullText)){type='remote';}
    var salaryMin=null,salaryMax=null,salaryCurrency=null;
    var salaryMatch=fullText.match(/(?:Salary[:\s]*)?([$£€])?\s?([\d,]+)(?:\s?(?:-|\sto\s)\s?([\d,]+))?\s?(USD|EUR|GBP)?/i);
    if(salaryMatch){
        salaryCurrency=salaryMatch[1]||salaryMatch[4]||null;
        salaryMin=parseInt(salaryMatch[2].replace(/,/g,''),10);
        if(salaryMatch[3]){salaryMax=parseInt(salaryMatch[3].replace(/,/g,''),10);}
    }
    result.push({
        title:title||null,
        companyName:null,
        description:description,
        location:location,
        jobType:type,
        sourceUrl:link||null,
        postedDateIsoString:postedDate,
        deadlineIsoString:null,
        salaryMin:salaryMin,
        salaryMax:salaryMax,
        salaryCurrency:salaryCurrency
    });
});