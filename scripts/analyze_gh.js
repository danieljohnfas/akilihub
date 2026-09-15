const { execSync } = require('child_process');

try {
  const out = execSync('gh run list --repo danieljohnfas/akilihub --limit 1000', { encoding: 'utf8' });
  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  
  const lines = out.split('\\n').filter(Boolean).filter(l => {
    const cols = l.split('\\t');
    if (cols.length < 9) return false;
    const dateStr = cols[8];
    const date = new Date(dateStr);
    return date >= last30;
  });

  console.log(`Total runs in last 30 days: \${lines.length}`);
  
  const stats = lines.reduce((acc, l) => {
    const cols = l.split('\\t');
    const status = cols[1];
    const wf = cols[2].trim().substring(0, 35);
    const key = `\${wf} | \${status}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
  for (const [key, count] of sorted) {
    console.log(`- \${key}: \${count}`);
  }
} catch (e) {
  console.error(e);
}
