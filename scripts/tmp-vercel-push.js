const { exec } = require('child_process');
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5d2llbmZmYWh2bXlsc3Nub3JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4OTM5OTMsImV4cCI6MjA5ODQ2OTk5M30.EzpyyED8RFFYbP9B9nPJXlL2ygdJH_QORfi2w-hx5A8";

const child = exec('npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production -y', (err, stdout, stderr) => {
  if (err) console.error("Error:", err);
  console.log(stdout);
  console.log(stderr);
});

child.stdin.write(key);
child.stdin.end();
