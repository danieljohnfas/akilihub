(function(){
  const clean = s=> s && s.replace(/\s+/g,' ').trim();
  let containers = [];
  const listSelectors = ['.job','.vacancy','.job-listing','.listing-item','article.job','.result'];
  listSelectors.forEach(sel=>{ const f=$(sel); if(f.length) containers.push(f); });
  if(containers.length===0) containers.push($('body'));
  containers.forEach($c=>{
    const items = $c.is('body,article') ? $c : $c.find('.job,.vacancy,.job-listing,.listing-item,article');
    if(items.length===0) items.add($c);
    items.each((_,el)=>{
      const $j=$(el);
      const title = clean($j.find('h1,h2,.job-title,.title,[itemprop="title"]').first().text()||$j.attr('title')||$j.find('a').first().text());
      if(!title) return;
      const company = clean($j.find('.company-name,.company,.employer,[itemprop="hiringOrganization"]').first().text());
      const location = clean($j.find('.location,.job-location,[itemprop="jobLocation"]').first().text());
      const typeRaw = clean($j.find('.job-type,.employment-type,[itemprop="employmentType"]').first().text()).toLowerCase();
      let jobType=null;
      if(/full.time|full_time/.test(typeRaw)) jobType='full_time';
      else if(/part.time|part_time/.test(typeRaw)) jobType='part_time';
      else if(/contract/.test(typeRaw)) jobType='contract';
      else if(/intern/.test(typeRaw)) jobType='internship';
      else if(/remote/.test(typeRaw)) jobType='remote';
      const description = clean($j.find('.description,.job-description,.summary,[itemprop="description"]').first().text());
      let sourceUrl = $('link[rel="canonical"]').attr('href')||$j.find('a').first().attr('href')||'';
      const postedDateStr = $j.find('time[datetime],.date-posted,[itemprop="datePosted"]').first().attr('datetime')||$j.find('time[datetime],.date-posted,[itemprop="datePosted"]').first().text();
      let postedDateIso=null;
      if(postedDateStr){ const d=new Date(postedDateStr); if(!isNaN(d.getTime())) postedDateIso=d.toISOString(); }
      const deadlineStr = $j.find('.deadline,.closing-date,[itemprop="validThrough"]').first().attr('datetime')||$j.find('.deadline,.closing-date,[itemprop="validThrough"]').first().text();
      let deadlineIso=null;
      if(deadlineStr){ const d=new Date(deadlineStr); if(!isNaN(d.getTime())) deadlineIso=d.toISOString(); }
      const salaryText = clean($j.find('.salary,.compensation,[itemprop="baseSalary"]').first().text());
      let salaryMin=null,salaryMax=null,salaryCurrency=null;
      if(salaryText){
        const nums = salaryText.match(/[\d,]+(?:\.\d+)?/g);
        if(nums){
          const vals = nums.map(n=>parseFloat(n.replace(/,/g,'')));
          if(vals.length>=2){ salaryMin=vals[0]; salaryMax=vals[1]; }
          else if(vals.length===1){ salaryMin=vals[0]; salaryMax=vals[0]; }
        }
        const cur = salaryText.match(/([A-Z]{3}|[$€£¥])/);
        if(cur){
          let c=cur[1];
          if(c.length===1){ switch(c){ case'$':c='USD';break; case'€':c='EUR';break; case'£':c='GBP';break; case'¥':c='JPY';break; } }
          salaryCurrency=c;
        }
      }
      result.push({
        title,
        companyName: company||null,
        description: description||null,
        location: location||null,
        jobType: jobType||null,
        sourceUrl: sourceUrl||null,
        postedDateIsoString: postedDateIso||null,
        deadlineIsoString: deadlineIso||null,
        salaryMin,
        salaryMax,
        salaryCurrency: salaryCurrency||null
      });
    });
  });
})();