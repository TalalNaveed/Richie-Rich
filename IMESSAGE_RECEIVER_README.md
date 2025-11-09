# iMessage JSON Receiver Setup

This setup allows you to receive JSON receipt data from a Mac via ngrok and automatically process it into your website.

## Setup Instructions

### 1. Start the Next.js Server

Make sure your Next.js development server is running:

```bash
npm run dev
```

### 2. Set up ngrok

On your Mac, set up ngrok to expose your local server:

```bash
# Install ngrok if you haven't already
# Then run:
ngrok http 3000
```

The ngrok URL is already hardcoded in the scripts: `https://bustlingly-cytological-concetta.ngrok-free.dev`

### 3. Run the Listener Script

In your project directory, run the Node.js listener script (recommended):

```bash
# Run the listener (checks every second)
node listen.js
```

Or use the bash version:

```bash
./listen.sh
```

The listener will:
- **Poll every second** to check for new receipts from Mac
- **Track processed receipts** to avoid duplicates
- **Automatically process** new receipts when detected
- **Log all activity** to the console

**Note:** Make sure your Next.js server is running (`npm run dev`) before starting the listener.

### 4. Send JSON from Mac

On your Mac, use wget to send JSON files to the endpoint:

```bash
wget -r -np -nH --cut-dirs=1 \
  --post-data='{"orderName":"Starbucks","items":[{"name":"Latte","price":5.50,"quantity":1}],"total":5.50}' \
  --header="Content-Type: application/json" \
  https://bustlingly-cytological-concetta.ngrok-free.dev/api/imessage-receive
```

Or if you have a JSON file:

```bash
wget -r -np -nH --cut-dirs=1 \
  --post-file=receipt.json \
  --header="Content-Type: application/json" \
  https://bustlingly-cytological-concetta.ngrok-free.dev/api/imessage-receive
```

Or simply use the base URL (the script will handle routing):

```bash
wget -r -np -nH --cut-dirs=1 https://bustlingly-cytological-concetta.ngrok-free.dev/
```

## JSON Format

The JSON should follow this structure:

```json
{
  "orderName": "Merchant Name",
  "location": "Optional location",
  "items": [
    {
      "name": "Item Name",
      "quantity": 1,
      "price": 10.00,
      "ppu": 10.00
    }
  ],
  "total": 10.00,
  "subtotal": 10.00,
  "tax": 0.50,
  "tip": 1.00,
  "dateTime": "2024-01-15T14:30:00Z"
}
```

## How It Works

1. **Listener script runs** → Polls `/api/imessage-receive?check=true` every second
2. **Mac sends JSON** → POST request to `/api/imessage-receive` (via wget/ngrok)
3. **API receives JSON** → Validates, checks for duplicates (via hash), processes if new
4. **API processes JSON** → Saves to file system, saves to database, tracks as processed
5. **Listener detects new receipt** → Logs processing, marks as processed locally
6. **Frontend polls** → Dashboard checks every 5 seconds for new receipts
7. **Notification appears** → Toast notification shows when new receipt is received
8. **Transactions refresh** → Recent transactions list automatically updates

### Duplicate Prevention

The system uses **two layers** of duplicate detection:

1. **API-level**: Creates MD5 hash of receipt content, checks against `.receipt-hashes.json`
2. **Listener-level**: Tracks processed timestamps in `.processed-imessage-receipts.json`

This ensures receipts are never processed twice, even if:
- The Mac sends the same receipt multiple times
- The listener script restarts
- Network issues cause retries

## API Endpoints

### POST `/api/imessage-receive`
Receives JSON receipt data from Mac.

**Request Body:**
```json
{
  "orderName": "Starbucks",
  "items": [...],
  "total": 10.00
}
```

**Response:**
```json
{
  "success": true,
  "receipt": {...},
  "filename": "imessage-1234567890.json",
  "transactionId": 123,
  "message": "JSON received and processed successfully"
}
```

### GET `/api/imessage-receive?check=true`
Checks for new receipts (used by frontend polling).

**Response:**
```json
{
  "hasNewReceipt": true,
  "receipt": {
    "orderName": "Starbucks",
    "timestamp": 1234567890
  },
  "transactionId": 123
}
```

### GET `/api/imessage-receive`
Health check endpoint.

## Files Created

- `app/api/imessage-receive/route.ts` - API endpoint handler
- `listen.js` - Node.js listener script (recommended, polls every second)
- `listen.sh` - Bash listener script (alternative)
- Receipts saved to: `xAI/processed-receipts/imessage-*.json`
- Last receipt tracked in: `xAI/processed-receipts/.last-imessage-receipt.json`
- Processed receipts tracked in: `xAI/processed-receipts/.processed-imessage-receipts.json`
- Receipt hashes tracked in: `xAI/processed-receipts/.receipt-hashes.json`

## Troubleshooting

1. **No notification appears**: Check browser console for errors, ensure polling is working
2. **JSON not processed**: Check API logs, verify JSON format matches expected structure
3. **ngrok connection fails**: Ensure ngrok is running and URL is correct
4. **Database errors**: Check that User 1 exists in database

## Testing Locally

You can test the endpoint locally without ngrok:

```bash
curl -X POST http://localhost:3000/api/imessage-receive \
  -H "Content-Type: application/json" \
  -d '{
    "orderName": "Test Store",
    "items": [
      {"name": "Test Item", "price": 10.00, "quantity": 1}
    ],
    "total": 10.00
  }'
```

