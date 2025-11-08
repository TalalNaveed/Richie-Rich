#!/bin/bash
echo "🧪 Testing iMessage Watcher Configuration"
echo ""
echo "Current .env settings:"
grep IMESSAGE .env 2>/dev/null || echo "No iMessage settings found in .env"
echo ""
echo "Starting watcher in test mode..."
echo "(Send an UNREAD message with image to test)"
echo ""
npm run imessage:watch
