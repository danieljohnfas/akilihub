async function testCommsForum() {
  const endpoints = [
    'https://comms.southsudanngoforum.org/categories.json',
    'https://comms.southsudanngoforum.org/latest.json',
    'https://comms.southsudanngoforum.org/c/vacancies/7.json',
    'http://comms.southsudanngoforum.org/categories.json',
  ];

  for (const ep of endpoints) {
    try {
      console.log(`Testing ${ep}...`);
      const res = await fetch(ep, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
        signal: AbortSignal.timeout(8000)
      });
      console.log(`  Status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`  Data keys: ${Object.keys(data).join(', ')}`);
        if (data.category_list) {
          console.log('  Categories:');
          data.category_list.categories.forEach(c => console.log(`    - [${c.id}] ${c.name} (slug: ${c.slug}, topics: ${c.topic_count})`));
        }
        if (data.topic_list) {
          console.log('  Topics:');
          data.topic_list.topics.slice(0, 5).forEach(t => console.log(`    - [${t.id}] ${t.title} (posts: ${t.posts_count})`));
        }
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
}

testCommsForum();
