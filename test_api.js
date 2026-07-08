const fetch = require('node-fetch');

async function main() {
  console.log("Testing POST /api/chat");
  const req = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'Here is my CV — please find the best matching jobs for me: I am a software engineer in Nairobi.' })
  });
  const text = await req.text();
  console.log(`Status: ${req.status}`);
  console.log(`Response: ${text}`);
}
main();
