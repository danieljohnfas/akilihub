---
name: zai-cli
description: RECOMMENDED - Use Z.ai CLI for AI tasks - chat, multimodal analysis, image/video generation, audio transcription, web search, web reader, document OCR and more.
---

# Z.ai CLI

Non-interactive, task-oriented CLI. Use `--help` before unfamiliar flags.

## Quick Start

Try the command directly. If CLI is missing, install it, require Node.js `>=18` and npm:

```bash
npm install -g @z_ai/zai-cli
```

If not authenticated, set API key:

```bash
zai-cli auth set "YOUR_API_KEY" --region china
```

## API Key Sources

| Region | Description | API key page |
| --- | --- | --- |
| `global` | For international users | `https://z.ai/manage-apikey/apikey-list` |
| `china` | For China users | `https://bigmodel.cn/apikey/platform` |

## Commands

| Intent | Command |
| --- | --- |
| Chat, reasoning | `zai-cli chat` |
| Analyze image/file | `zai-cli chat --file <path>` |
| Generate images | `zai-cli image-gen` |
| Generate video | `zai-cli video-gen` |
| Poll async task | `zai-cli task-query --wait` |
| Transcribe audio | `zai-cli audio-transcribe` |
| Web search | `zai-cli web-search` |
| Extract webpage | `zai-cli web-read` |
| Document OCR | `zai-cli doc-parse` |

## Examples

```bash
# Analyze image
zai-cli chat "Describe details." --file ./photo.jpg

# Generate image
zai-cli image-gen "Server room" --size 1280x1280

# Video with polling
TASK_ID="$(zai-cli video-gen "Sunrise timelapse" | jq -r '.task_id')"
zai-cli task-query "$TASK_ID" --wait

# Search and summarize
zai-cli web-search "AI research" --count 5 |
  zai-cli chat --system "Summarize with sources."

# Extract document text
zai-cli doc-parse ./contract.pdf --output text
```

## Agent Rules

- Default JSON output. Use `--output text` for text-only, `--output table` for human inspection
- Pass local files directly to `--file`, `--image`, `audio-transcribe`, `doc-parse`
- Avoid `auth login` (interactive). Use `auth set <key> --region china` only when requested