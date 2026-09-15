const fs = require('fs');
const env = fs.readFileSync('.env.remote', 'utf8');
const key = env.match(/GROQ_API_KEY=(.*)/)[1].trim();
fetch('https://api.groq.com/openai/v1/models', {
  headers: { 'Authorization': 'Bearer ' + key }
}).then(res => res.json()).then(data => console.log(data.data.map(m => m.id)));
