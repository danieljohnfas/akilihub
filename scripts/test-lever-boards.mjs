async function testLeverBoards() {
  const boards = [
    'sunking',
    'm-kopa',
    'flutterwave',
    'kobo360',
    'moniepoint',
    'opay',
    'fairmoney',
    'sendwave',
    'dlocal',
  ];

  for (const b of boards) {
    try {
      const url = `https://api.lever.co/v0/postings/${b}?mode=json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        console.log(`✅ Lever Board "${b}": ${data.length} vacancies`);
        if (data.length > 0) {
          const sample = data.slice(0, 2).map(j => ({
            text: j.text,
            location: j.categories?.location,
            url: j.hostedUrl
          }));
          console.log('   Sample:', JSON.stringify(sample));
        }
      } else {
        console.log(`❌ Lever Board "${b}": Status ${res.status}`);
      }
    } catch (e) {
      console.log(`⚠️ Lever Board "${b}": ${e.message}`);
    }
  }
}

testLeverBoards();
