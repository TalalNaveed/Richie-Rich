#!/bin/bash

# listen.sh - Continuously polls for JSON files from Mac via ngrok
# Runs every second to check for new receipts and processes them

NGROK_URL="https://bustlingly-cytological-concetta.ngrok-free.dev"
API_ENDPOINT="${NGROK_URL}/api/imessage-receive"
PROCESSED_FILE="xAI/processed-receipts/.processed-imessage-receipts.json"
POLL_INTERVAL=1  # Check every second

echo "🚀 Starting iMessage JSON listener..."
echo "📡 Polling endpoint: ${API_ENDPOINT}"
echo "⏱️  Checking every ${POLL_INTERVAL} second(s)"
echo ""

# Create processed receipts tracking file if it doesn't exist
mkdir -p xAI/processed-receipts
if [ ! -f "$PROCESSED_FILE" ]; then
  echo "[]" > "$PROCESSED_FILE"
  echo "📝 Created processed receipts tracking file"
fi

# Function to check if receipt was already processed
is_processed() {
  local timestamp=$1
  if [ -f "$PROCESSED_FILE" ]; then
    grep -q "\"$timestamp\"" "$PROCESSED_FILE"
    return $?
  fi
  return 1
}

# Function to mark receipt as processed
mark_processed() {
  local timestamp=$1
  local order_name=$2
  local transaction_id=$3
  
  if [ ! -f "$PROCESSED_FILE" ]; then
    echo "[]" > "$PROCESSED_FILE"
  fi
  
  # Add to processed list (simple JSON array)
  local temp_file=$(mktemp)
  python3 -c "
import json
import sys

try:
    with open('$PROCESSED_FILE', 'r') as f:
        processed = json.load(f)
except:
    processed = []

processed.append({
    'timestamp': $timestamp,
    'orderName': '$order_name',
    'transactionId': $transaction_id,
    'processedAt': '$(date -u +"%Y-%m-%dT%H:%M:%SZ")'
})

with open('$PROCESSED_FILE', 'w') as f:
    json.dump(processed, f, indent=2)
" 2>/dev/null || {
    # Fallback if Python not available - use simple append
    echo "{\"timestamp\": $timestamp, \"orderName\": \"$order_name\", \"transactionId\": $transaction_id}" >> "$PROCESSED_FILE"
  }
}

# Function to process new receipt
process_receipt() {
  local timestamp=$1
  local order_name=$2
  local transaction_id=$3
  
  echo "✅ Processing new receipt:"
  echo "   📦 Order: $order_name"
  echo "   🆔 Transaction ID: $transaction_id"
  echo "   ⏰ Timestamp: $timestamp"
  
  # Mark as processed
  mark_processed "$timestamp" "$order_name" "$transaction_id"
  
  echo "   ✅ Receipt processed and saved!"
  echo ""
}

# Main polling loop
echo "✅ Listener is ready! Press Ctrl+C to stop"
echo ""

while true; do
  # Check for new receipts
  response=$(curl -s -w "\n%{http_code}" "${API_ENDPOINT}?check=true" 2>/dev/null)
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ]; then
    # Parse JSON response (using Python for reliable parsing)
    result=$(echo "$body" | python3 -c "
import json
import sys

try:
    data = json.load(sys.stdin)
    if data.get('hasNewReceipt'):
        print(f\"NEW:{data['receipt']['orderName']}:{data['receipt']['timestamp']}:{data.get('transactionId', '')}\")
    else:
        print('NONE')
except:
    print('ERROR')
" 2>/dev/null)
    
    if [ "$result" != "NONE" ] && [ "$result" != "ERROR" ] && [ -n "$result" ]; then
      # Extract receipt info
      IFS=':' read -r status order_name timestamp transaction_id <<< "$result"
      
      if [ "$status" = "NEW" ]; then
        # Check if already processed
        if ! is_processed "$timestamp"; then
          process_receipt "$timestamp" "$order_name" "$transaction_id"
        else
          echo "⏭️  Receipt $timestamp already processed, skipping..."
        fi
      fi
    fi
  else
    # If endpoint not available, try to fetch JSON directly
    echo "⚠️  Check endpoint returned $http_code, trying direct fetch..."
    
    # Try to get JSON from ngrok (if Mac is sending via wget)
    json_response=$(curl -s "${API_ENDPOINT}" 2>/dev/null)
    
    if echo "$json_response" | python3 -c "import json, sys; json.load(sys.stdin)" 2>/dev/null; then
      # Valid JSON received - process it
      timestamp=$(date +%s%3N)  # Current timestamp in milliseconds
      order_name=$(echo "$json_response" | python3 -c "import json, sys; print(json.load(sys.stdin).get('orderName', 'Unknown'))" 2>/dev/null)
      
      if [ -n "$order_name" ] && [ "$order_name" != "Unknown" ]; then
        if ! is_processed "$timestamp"; then
          # Send to API for processing
          process_result=$(curl -s -X POST "${API_ENDPOINT}" \
            -H "Content-Type: application/json" \
            -d "$json_response" 2>/dev/null)
          
          transaction_id=$(echo "$process_result" | python3 -c "import json, sys; print(json.load(sys.stdin).get('transactionId', ''))" 2>/dev/null)
          
          if [ -n "$transaction_id" ]; then
            process_receipt "$timestamp" "$order_name" "$transaction_id"
          fi
        fi
      fi
    fi
  fi
  
  # Wait before next check
  sleep $POLL_INTERVAL
done
