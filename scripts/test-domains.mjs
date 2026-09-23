async function testDomains() {
  const domains = [
    'https://www.southsudanjob.com/',
    'https://www.jobinburundi.com/',
    'https://www.jobincongo.com/',
    'https://www.mediacongo.net/emplois.html',
    'https://www.congo-site.com/',
    'https://somalia.ureport.in/',
  ];

  for (const d of domains) {
    try {
      const res = await fetch(d, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(6000)
      });
      console.log(`${d} -> Status: ${res.status}`);
    } catch (e) {
      console.log(`${d} -> Error: ${e.message}`);
    }
  }
}

testDomains();
