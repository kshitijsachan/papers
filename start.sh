#!/bin/bash
# Start the papers app (backend + frontend)

cd "$(dirname "$0")"

# Stop any LaunchAgents that might conflict
launchctl unload ~/Library/LaunchAgents/com.papers.backend.plist 2>/dev/null
launchctl unload ~/Library/LaunchAgents/com.papers.frontend.plist 2>/dev/null

# Kill any existing processes on our ports
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
sleep 1

# Start backend
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
echo "Papers app running:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop"

# Handle Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
