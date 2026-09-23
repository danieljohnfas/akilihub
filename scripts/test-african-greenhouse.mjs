async function testAfricanGreenhouseBoards() {
  const boards = [
    'oneacrefund',
    'greenlightplanet',
    'mkopa',
    'wavemobilemoney',
    'dlight',
    'chippercash',
    'kokonetworks',
    'bboxx',
    'flutterwave',
    'andela'
  ];

  for (const b of boards) {
    try {
      const url = `https://boards-api.greenhouse.io/v1/boards/${b}/jobs?content=true`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json();
        const jobs = data.jobs || [];
        console.log(`✅ Board "${b}": ${jobs.length} total vacancies`);
        const sample = jobs.slice(0, 2).map(j => ({
          title: j.title,
          location: j.location?.name,
          url: j.absolute_url
        }));
        console.log('   Sample:', JSON.stringify(sample));
      } else {
        console.log(`❌ Board "${b}": Status ${res.status}`);
      }
    } catch (e) {
      console.log(`⚠️ Board "${b}": ${e.message}`);
    }
  }
}

testAfricanGreenhouseBoards();
