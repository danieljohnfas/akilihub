#!/bin/bash
# start.sh — Launch both the FastAPI sidecar and the Scrapling MCP server.
# Both processes run concurrently; the container exits if either dies.

set -e

echo "[start.sh] Starting FastAPI sidecar on port 7860..."
uvicorn main:app --host 0.0.0.0 --port 7860 --workers 1 &
API_PID=$!

# Wait for the API process to exit
wait $API_PID
EXIT_CODE=$?

echo "[start.sh] API service exited (code=$EXIT_CODE). Stopping container."
exit $EXIT_CODE
