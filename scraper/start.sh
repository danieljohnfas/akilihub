#!/bin/sh
# start.sh — Launch both the FastAPI sidecar and the Scrapling MCP server.
# Both processes run concurrently; the container exits if either dies.

set -e

echo "[start.sh] Starting Scrapling MCP server on port 8765 (background)..."
python /app/mcp_server.py --mode http --host 0.0.0.0 --port 8765 &
MCP_PID=$!

echo "[start.sh] Starting FastAPI sidecar on port 7860..."
uvicorn main:app --host 0.0.0.0 --port 7860 --workers 1 &
API_PID=$!

# Wait for either process to exit; if one dies, kill the other
wait -n $MCP_PID $API_PID
EXIT_CODE=$?

echo "[start.sh] A service exited (code=$EXIT_CODE). Stopping container."
kill $MCP_PID $API_PID 2>/dev/null || true
exit $EXIT_CODE
