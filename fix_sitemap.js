const fs = require('fs');
let content = fs.readFileSync('src/app/sitemaps/[id]/route.ts', 'utf8');
content = content.replace(/\\\/g, '\');
content = content.replace(/\\\$/g, '$');
content = content.replace(/\\\\n/g, '\\n');
content = content.replace(/\\\\s/g, '\\s');
fs.writeFileSync('src/app/sitemaps/[id]/route.ts', content);
console.log('Fixed sitemaps route');
