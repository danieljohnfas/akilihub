import sys

with open('src/lib/ai/router.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix Groq
code = code.replace("groq('llama-3.3-70b-versatile')", "groq('qwen/qwen3.6-27b')")
code = code.replace("name: `Groq Llama 3.3 70B (${i + 1})`", "name: `Groq Qwen 3.6 (${i + 1})`")

# Fix Cloudflare (the exact string in the file)
code = code.replace("@cf/meta/llama-3.1-8b-instruct", "@cf/meta/llama-3.1-8b-instruct-fp8")

# Fix OpenRouter
code = code.replace("meta-llama/llama-3.1-8b-instruct:free", "openrouter/free")

# Fix think tags
target = "let text = textResult.text.trim();"
replacement = "let text = textResult.text.trim();\n        if (text.includes('<think>')) { text = text.replace(/<think>[\\s\\S]*?<\\/think>/g, '').trim(); }"
code = code.replace(target, replacement)

with open('src/lib/ai/router.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done")
