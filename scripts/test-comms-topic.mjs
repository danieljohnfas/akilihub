async function testTopic() {
  const listRes = await fetch('https://comms.southsudanngoforum.org/c/jobs/5.json', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const listData = await listRes.json();
  const topics = listData.topic_list?.topics || [];
  console.log(`Retrieved ${topics.length} topics in Job Vacancies:`);
  for (const t of topics.slice(0, 5)) {
    console.log(`- [${t.id}] ${t.title} (slug: ${t.slug})`);
  }

  if (topics.length > 0) {
    const firstId = topics[0].id;
    console.log(`\nFetching detail for topic ${firstId}...`);
    const detailRes = await fetch(`https://comms.southsudanngoforum.org/t/${firstId}.json`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const detailData = await detailRes.json();
    const post = detailData.post_stream?.posts?.[0];
    console.log('Post cooked HTML len:', post?.cooked?.length);
    console.log('Post snippet:', post?.cooked?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 400));
  }
}

testTopic();
