async function testAts() {
  const endpoints = [
    { name: 'GiveDirectly (Lever)', url: 'https://api.lever.co/v0/postings/give-directly' },
    { name: 'One Acre Fund (Greenhouse)', url: 'https://boards-api.greenhouse.io/v1/boards/oneacrefund/jobs' },
    { name: 'Mercy Corps (Jobvite / Greenhouse)', url: 'https://boards-api.greenhouse.io/v1/boards/mercycorps/jobs' },
    { name: 'IRC (Greenhouse / SmartRecruiters)', url: 'https://api.smartrecruiters.com/v1/companies/IRC/postings' },
  ];

  for (const ep of endpoints) {
    try {
      console.log(`Checking ${ep.name}...`);
      const res = await fetch(ep.url, { signal: AbortSignal.timeout(6000) });
      console.log(`  Status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.jobs || data.content || []);
        console.log(`  Total postings: ${list.length}`);
        if (list.length > 0) {
          const sample = list.slice(0, 3).map(j => ({
            title: j.text || j.title || j.name,
            location: j.categories?.location || j.location?.name || j.location,
            url: j.hostedUrl || j.absolute_url || j.ref
          }));
          console.log('  Sample jobs:', JSON.stringify(sample, null, 2));
        }
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
}

testAts();
