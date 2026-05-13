#!/bin/sh
set -e

echo "Starting NovelFlow..."

# Load environment variables if .env exists
if [ -f /app/.env ]; then
    echo "Loading environment from /app/.env"
    set -a
    . /app/.env
    set +a
fi

# Start nginx in background
echo "Starting Nginx..."
nginx -g 'daemon off;' &
NGINX_PID=$!

# Start backend Node.js server with environment variables
echo "Starting Backend (Node.js)..."
cd /app
node dist/index.js &
BACKEND_PID=$!

# Wait for both processes
echo "Services started:"
echo "  - Nginx (PID: $NGINX_PID)"
echo "  - Backend (PID: $BACKEND_PID)"

# Handle shutdown gracefully
trap "kill $NGINX_PID $BACKEND_PID 2>/dev/null" SIGTERM SIGINT

# Keep container running
wait $NGINX_PID $BACKEND_PID
