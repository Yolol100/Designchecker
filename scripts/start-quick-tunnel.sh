#!/usr/bin/env sh
set -eu
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is not installed. Start the MCP server locally or install cloudflared from its official distribution." >&2
  exit 1
fi
PORT="${PORT:-8787}"
echo "Start 'npm run mcp:http' in another terminal, then use the HTTPS URL printed below with /mcp." >&2
exec cloudflared tunnel --url "http://127.0.0.1:${PORT}"
