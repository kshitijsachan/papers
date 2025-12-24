#!/bin/bash
# Start papers app in DEV MODE (with hot reload)
# Use this for development. Use `papers` command for normal usage.

cd "$(dirname "$0")"

# Kill any existing processes on our ports
echo "Stopping existing services..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
sleep 1

# Start backend with --reload for hot reloading
cd backend
uv run uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Start frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Wait for services to start
sleep 2

echo ""
echo "Papers app running in DEV MODE:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000 (with hot reload)"
echo ""
echo "Press Ctrl+C to stop"

# Handle Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
