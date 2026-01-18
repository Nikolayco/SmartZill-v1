#!/bin/bash
# Cleanup script for NikolayCo SmartZill
# Kills all related processes

echo "Stopping Nikolayco SmartZill..."

# Kill uvicorn/backend
echo "Killing backend processes..."
lsof -t -i :7777 | xargs kill -9 2>/dev/null || true
pkill -9 -f "uvicorn main:app" 2>/dev/null || true

# Kill VLC processes
echo "Killing VLC processes..."
pkill -9 vlc 2>/dev/null || true
pkill -9 -f "python-vlc" 2>/dev/null || true

# Kill any Python processes related to the app
echo "Killing related Python processes..."
pkill -9 -f "Nikolayco-SmartZill" 2>/dev/null || true

echo "✓ Cleanup complete!"
echo "All processes stopped."
