const fs = require('fs');
let text = fs.readFileSync('src/lib/ai/router.ts', 'utf8');

// Remove duplicate SambaNova block
text = text.replace(/\/\/ -- PRIORITY 4: SAMBANOVA[\s\S]*?\}\);\n\}\);/, '');

// Remove duplicate Cerebras block
text = text.replace(/\/\/ -- PRIORITY 6: CEREBRAS[\s\S]*?\}\);\n\}\);/, '');

// Bring back Groq but marked disabled
text = text.replace(/\/\/ -- PRIORITY 3: GROQ ----------------------------------------------------\/\/ ?? PRIORITY 1: SAMBANOVA/, '// ?? PRIORITY 1: SAMBANOVA');

fs.writeFileSync('src/lib/ai/router.ts', text);
console.log('Cleanup done.');
