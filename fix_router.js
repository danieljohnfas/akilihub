import fs from 'fs';
let code = fs.readFileSync('/opt/akilibrain/src/lib/ai/router.ts', 'utf8');

const oldStr = 'if (usesTextModeFallback(activeKey.id)) {';
const newStr = `if (usesTextModeFallback(activeKey.id)) {
          let text = '';
          if (activeKey.id.startsWith('sambanova-')) {
             const res = await fetch('https://api.sambanova.ai/v1/chat/completions', {
               method: 'POST',
               headers: {
                 'Authorization': 'Bearer ' + (activeKey.model.provider === 'openai' ? 'c7692676-dfab-4a13-93ed-cb31d5ae7839' : process.env.SAMBANOVA_API_KEY),
                 'Content-Type': 'application/json'
               },
               body: JSON.stringify({
                 model: 'Meta-Llama-3.1-70B-Instruct',
                 messages: [
                   { role: 'system', content: (params.system || '') + '\n\nCRITICAL INSTRUCTION: You MUST return ONLY a valid JSON object. Do not include any explanations, preambles, or markdown formatting like \`\`\`json. Start the response directly with { and end it with }.' },
                   { role: 'user', content: params.prompt || '' }
                 ]
               })
             });
             const data = await res.json();
             if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
             text = data.choices[0].message.content.trim();
          } else {
             const { schema, mode, output, ...safeParams } = params as any;
             const textResult = await withHardTimeout(
               (generateText as any)({
                 ...safeParams,
                 model: activeKey.model,
                 prompt: (params.prompt || '') + '\n\nCRITICAL INSTRUCTION: You MUST return ONLY a valid JSON object. Do not include any explanations, preambles, or markdown formatting like \`\`\`json. Start the response directly with { and end it with }.'
               }),
               AI_TIMEOUT_MS,
               activeKey.name,
             );
             text = (textResult as any).text.trim();
          }

          if (text.includes('<think>')) {
              const endThink = text.lastIndexOf('</think>');
              if (endThink !== -1) {
                  text = text.substring(endThink + 8).trim();
              } else {
                  throw new Error("Unclosed <think> tag");
              }
          }
`;

const idxStart = code.indexOf(oldStr);
if (idxStart !== -1) {
  const blockStart = code.substring(0, idxStart);
  let blockEnd = code.substring(idxStart);
  blockEnd = blockEnd.replace(/if \(usesTextModeFallback\(activeKey\.id\)\) \{[\s\S]*?throw new Error\("Unclosed <think> tag"\);\s*\}\s*\}/, newStr);
  code = blockStart + blockEnd;
}

code = code.replace(/google\/gemini-2.0-flash-lite-preview-02-05/g, 'google/gemini-2.5-flash');

fs.writeFileSync('/opt/akilibrain/src/lib/ai/router.ts', code);
