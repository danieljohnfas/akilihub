# Z.ai CLI

`zai-cli` is the official Z.ai terminal-native toolkit for AI agents. It provides atomic, script-friendly CLI commands for chat, media generation, parsing, search, and more. Designed for AI agents, automation pipelines, and developer terminals.

## Install

Requires Node.js `>=18` and npm. Supports macOS, Linux, and Windows.

```bash
npm install -g @z_ai/zai-cli
zai-cli --version
```

## Authentication

```bash
zai-cli auth set "your-key" --region china
```

Get an API key:

| Region | API key page |
| --- | --- |
| `global` | [https://z.ai/manage-apikey/apikey-list](https://z.ai/manage-apikey/apikey-list) |
| `china` | [https://bigmodel.cn/apikey/platform](https://bigmodel.cn/apikey/platform) |

## Commands

```bash
zai-cli chat "What is quantum computing?"
echo "Summarize this text" | zai-cli chat
zai-cli image-gen "a cat floating in space"
zai-cli video-gen "timelapse of a sunrise"
zai-cli task-query <task_id> --wait
zai-cli audio-transcribe ./meeting.mp3
zai-cli web-search "latest AI research"
zai-cli web-read "https://example.com/article"
zai-cli doc-parse ./contract.pdf
```

All commands output JSON by default and support:

```bash
--output json|text|table
--quiet
--verbose
--api-key <key>
--timeout <ms>
```

Most model-backed commands also support `-m, --model <model>`.

## Agent Skill

The repository includes a concise, single-file AI-agent usage skill at [`skills/zai-cli`](./skills/zai-cli). It documents command selection, non-interactive authentication, structured output handling, and async video polling. Use `zai-cli <command> --help` for the complete runtime flag reference.

Install it with:

```bash
npx skills add zai-org/zai-cli
```

## Examples

Chat:

```bash
zai-cli chat "Explain quantum computing in one paragraph"
zai-cli chat "What is in this image?" --file ./photo.jpg -m glm-5v-turbo
zai-cli chat "hello" --stream
```

Image generation:

```bash
zai-cli image-gen "cyberpunk cityscape at night" --size 1280x1280 -n 2
```

Video generation:

```bash
zai-cli video-gen "ocean waves crashing" --wait
zai-cli video-gen "make the scene move" --image ./scene.jpg --quality quality
```

Web tools:

```bash
zai-cli web-search "AI news this week" --count 5
zai-cli web-read "https://docs.z.ai/api-reference/"
```

Document parsing:

```bash
zai-cli doc-parse ./contract.pdf --output text
zai-cli doc-parse --url "https://example.com/doc.pdf"
```

## Configuration

```bash
zai-cli config list
zai-cli config get default_chat_model
zai-cli config set default_chat_model glm-5.1
zai-cli auth set "your-key" --region china
zai-cli config set base_url https://proxy.example.com/api/paas/v4
```

`region` selects the standard API endpoint automatically. Use an HTTPS `base_url` only as an explicit custom endpoint override. Setting `region` clears a persisted `base_url` override.

Supported environment variables:

| Variable | Description |
| --- | --- |
| `ZAI_API_KEY` | API key |
| `ZAI_REGION` | `china` or `global`; defaults to `china` |
| `ZAI_BASE_URL` | Override HTTPS API base URL, for example when using a proxy |
| `ZAI_DEFAULT_MODEL` | Default model override |
| `ZAI_OUTPUT_FORMAT` | `json`, `text`, or `table` |
| `ZAI_TIMEOUT` | Request timeout in ms |
| `ZAI_LOG_DIR` | Override API call log directory |

## Development

Runtime installation supports Node.js `>=18`. The Vitest 4 development toolchain requires Node.js `^20`, `^22`, or `>=24`.

```bash
pnpm install
pnpm run build
pnpm test
pnpm run lint
```

## Smoke Testing

After building, run low-cost real API checks with the configured key:

```bash
export ZAI_API_KEY="your-key"
pnpm run build
pnpm run smoke
```

## License

MIT