#!/bin/bash

# Kill ports 7777, 5555, 8000, 3000 just in case
# Ensure we are in the script's directory
cd "$(dirname "$0")"
fuser -k 7777/tcp
fuser -k 5555/tcp
fuser -k 8000/tcp
fuser -k 3000/tcp

# Set Terminal Title
echo -ne "\033]0;Nikolayco_SmartZill_Terminal\007"
sleep 0.5

# Attempt to minimize
if command -v xdotool &> /dev/null; then
    xdotool search --name "Nikolayco_SmartZill_Terminal" windowminimize
elif command -v wmctrl &> /dev/null; then
    wmctrl -r "Nikolayco_SmartZill_Terminal" -b add,hidden
fi
# Fallback for XTerm
echo -ne "\033[2t"
fuser -k 8000/tcp
fuser -k 3000/tcp

# Start Backend
echo "Starting Backend..."
cd backend
if [ ! -d "venv" ]; then
    echo "Creating Python Virtual Environment..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1
# Run in unbuffered mode to see logs immediately
export PYTHONUNBUFFERED=1
uvicorn main:app --host 0.0.0.0 --port 7777 --reload &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready (Max 30 seconds)
echo "Waiting for Backend to initialize..."
MAX_RETRIES=30
COUNT=0
while ! curl -s http://localhost:7777 > /dev/null; do
    sleep 1
    COUNT=$((COUNT+1))
    if [ $COUNT -ge $MAX_RETRIES ]; then
        echo "Backend failed to start in time!"
        exit 1
    fi
    echo -n "."
done
echo "Backend Ready!"
sleep 2 # Extra safety buffer

# Start Frontend
echo "Starting Frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing Frontend Dependencies..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for Frontend (Next.js) to be ready
echo "Waiting for Frontend to initialize (http://localhost:5555)..."
MAX_RETRIES_FE=60
COUNT_FE=0
while ! curl -s http://localhost:5555 > /dev/null; do
    sleep 1
    COUNT_FE=$((COUNT_FE+1))
    if [ $COUNT_FE -ge $MAX_RETRIES_FE ]; then
        echo "Frontend failed to start in time!"
        # Don't exit, maybe just slow.
        break
    fi
    echo -n "."
done
echo " Frontend Ready!"

# Open Browser
# Check config for Auto-Open preference (Default True)
SHOULD_OPEN=$(python3 -c "import json, os; print(json.load(open('backend/config.json')).get('frontend_auto_open', True)) if os.path.exists('backend/config.json') else True")

if [ "$SHOULD_OPEN" == "True" ]; then
    echo "Auto-Opening Browser (Enabled in Settings)..."
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:5555" &
    elif command -v google-chrome &> /dev/null; then
        google-chrome "http://localhost:5555" &
    elif command -v firefox &> /dev/null; then
        firefox "http://localhost:5555" &
    fi
else
    echo "Browser Auto-Open is DISABLED in Settings."
fi

echo "System Started."
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║          🎵 NIKOLAYCO SMARTZILL BAŞLATILDI 🎵            ║"
echo "║                                                            ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║                                                            ║"
echo "║  📱 Arayüze Erişim:                                       ║"
echo "║     http://localhost:5555                                  ║"
echo "║                                                            ║"
echo "║  💡 Kullanım İpuçları:                                    ║"
echo "║     • CTRL + Tıklama = Yeni sekmede aç                    ║"
echo "║     • Terminal'i kapatmayın (sistem çalışmaya devam eder) ║"
echo "║     • Durdurmak için: Enter tuşuna basın                  ║"
echo "║                                                            ║"
echo "║  🔧 Sistem Bilgileri:                                     ║"
echo "║     Backend:  http://localhost:7777                        ║"
echo "║     Frontend: http://localhost:5555                        ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Wait for user to exit
read -p "Press Enter to Stop System..."

kill $BACKEND_PID
kill $FRONTEND_PID
