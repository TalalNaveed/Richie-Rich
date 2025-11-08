# 📱 iMessage Receipt Watcher - Complete Guide

## 🎯 Overview

The iMessage Receipt Watcher continuously monitors your iMessage conversations for receipt images and automatically processes them using xAI Grok Vision. No manual intervention needed!

## ✨ Key Features

1. **🔄 Continuous Monitoring** - Watches for new messages in real-time
2. **🚫 Duplicate Prevention** - Smart hashing prevents reprocessing
3. **🤖 Auto-Processing** - Sends receipts to xAI Grok automatically
4. **📱 Flexible Filtering** - Monitor specific sender or accept all
5. **💾 History Tracking** - Maintains processed message log
6. **🔔 Acknowledgments** - Sends confirmation back to sender

## 🚀 Quick Start

### 1. Configure Environment

```bash
# Copy example if you haven't already
cp .env.example .env

# Edit .env and add:
```

```bash
# Required: xAI API key
XAI_API_KEY=your-xai-key-here

# Optional: Filter by phone number (leave empty for ALL)
IMESSAGE_TARGET_NUMBER=

# Enable continuous watching
IMESSAGE_WATCH_MODE=true

# Auto-process with AI
IMESSAGE_AUTO_PROCESS=true
```

### 2. Start Watching

```bash
npm run imessage:watch
```

### 3. Send a Receipt

- Take photo of any receipt
- Send via iMessage (to yourself or configured number)
- Watch it get processed automatically!

## 📊 Example Output

```bash
🚀 iMessage Receipt Watcher Starting...

Configuration:
  Target Number: ALL (accept from any sender)
  Watch Mode: CONTINUOUS
  Auto-Process: ENABLED
  Save Directory: /path/to/saved-images

📋 Loaded history: 0 processed messages

👀 Watching for new messages... (Press Ctrl+C to stop)

💡 Tip: Send a receipt image via iMessage to see it processed automatically!

📨 New message from +1234567890
✅ Saved new image: receipt-1699388400000-IMG_1234.jpg
🤖 Auto-processing receipt with xAI Grok...
✨ Receipt processed successfully!

✅ Processed 1 new image(s)
```

## ⚙️ Configuration Options

### Target Number Modes

**Accept from ALL senders (Recommended for personal use):**
```bash
IMESSAGE_TARGET_NUMBER=
```

**Accept from specific number only:**
```bash
IMESSAGE_TARGET_NUMBER=+1234567890
```

### Watch Modes

**Continuous (Stay Running):**
```bash
IMESSAGE_WATCH_MODE=true
npm run imessage:watch
```

**One-Time (Process & Exit):**
```bash
IMESSAGE_WATCH_MODE=false
npm run imessage:once
```

### Auto-Processing

**Enabled (Automatic AI Processing):**
```bash
IMESSAGE_AUTO_PROCESS=true
```
- Images saved to `saved-images/`
- Automatically sent to xAI Grok
- JSON output saved to `processed-receipts/`
- Sender receives confirmation

**Disabled (Manual Processing):**
```bash
IMESSAGE_AUTO_PROCESS=false
```
- Images saved only
- Process later with: `npm run receipt:process`

## 🔄 Complete Workflow

```
┌────────────────────────────────────────────────────────────┐
│                     Your Receipt Journey                    │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 📸 Take photo of receipt on your phone                  │
│        ↓                                                     │
│  2. 💬 Send via iMessage (to yourself or target number)     │
│        ↓                                                     │
│  3. 👀 Watcher detects new message with image attachment    │
│        ↓                                                     │
│  4. #️⃣  Generates hash to check if already processed        │
│        ↓                                                     │
│  5. 💾 Saves image to saved-images/ folder                  │
│        ↓                                                     │
│  6. 📝 Updates .message-history.json with hash              │
│        ↓                                                     │
│  7. 🤖 [If AUTO_PROCESS] Sends to xAI Grok Vision          │
│        ↓                                                     │
│  8. 🧠 AI extracts merchant, items, prices, total, etc.     │
│        ↓                                                     │
│  9. 💾 Saves structured JSON to processed-receipts/         │
│        ↓                                                     │
│ 10. ✉️  Sends "Receipt received!" message back to sender    │
│        ↓                                                     │
│ 11. 🔁 Continues watching for next receipt...               │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

## 📂 File Structure

```
HackPrinceton/
├── .env                              # Your config (gitignored)
├── iMessage/
│   ├── imageExtract.ts              # Watcher script
│   ├── .message-history.json        # Processed hashes (gitignored)
│   ├── README.md                     # Module docs
│   └── saved-images/                # Received receipts
│       ├── receipt-1699388400000-IMG_1234.jpg
│       └── receipt-1699388401000-photo.jpg
│
└── xAI/
    └── processed-receipts/          # AI-extracted data
        ├── receipt-1699388400000-IMG_1234.json
        └── all-receipts.json
```

## 🔒 Hash-Based Duplicate Prevention

The watcher uses SHA-256 hashing to prevent reprocessing:

### Message Hash
```
Hash = SHA256(messageId + timestamp + sender)
```

### Attachment Hash
```
Hash = SHA256(filePath + fileSize + modTime + messageId)
```

### History Storage
```json
{
  "processedHashes": [
    "a1b2c3d4e5f6789...",
    "9876543210fedcba..."
  ],
  "lastProcessed": "2024-11-08T14:30:00.000Z"
}
```

## 🎛️ Available Commands

```bash
# Start continuous watching (recommended)
npm run imessage:watch

# Process once and exit
npm run imessage:once

# Process receipts manually
npm run receipt:process

# View statistics
npm run receipt:stats

# Test the system
npm run receipt:test
```

## 🐛 Troubleshooting

### Watcher not detecting messages

**Check permissions:**
```bash
# macOS Ventura+ requires Full Disk Access
# System Settings → Privacy & Security → Full Disk Access
# Add Terminal or iTerm
```

**Verify database access:**
```bash
ls -la ~/Library/Messages/chat.db
# Should show the iMessage database file
```

### Messages being reprocessed

**Clear history and restart:**
```bash
rm iMessage/.message-history.json
npm run imessage:watch
```

### Auto-processing not working

**Verify xAI configuration:**
```bash
# Check API key is set
grep XAI_API_KEY .env

# Test xAI connection
npm run receipt:test
```

**Check auto-process is enabled:**
```bash
grep IMESSAGE_AUTO_PROCESS .env
# Should show: IMESSAGE_AUTO_PROCESS=true
```

### No acknowledgment messages sent

**Optional feature** - If you don't want acknowledgments, comment out lines 147-153 in `imageExtract.ts`:

```typescript
// try {
//   if (message.sender && !message.isFromMe) {
//     await sdk.send(message.sender, {
//       text: `📸 Received your receipt! ...`
//     });
//   }
// } catch (sendError) {
//   console.error('⚠️  Could not send acknowledgment:', sendError);
// }
```

## 💡 Pro Tips

### 1. Test Before Production
```bash
# Test with one-time mode first
npm run imessage:once

# Send yourself a test receipt
# Verify it processes correctly
# Then enable watch mode
```

### 2. Monitor the Logs
```bash
# Run with output to file
npm run imessage:watch > imessage.log 2>&1 &
tail -f imessage.log
```

### 3. Set Up Auto-Start (macOS)
```bash
# Create LaunchAgent
~/Library/LaunchAgents/com.hackprinceton.imessage.plist
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.hackprinceton.imessage</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/npm</string>
        <string>run</string>
        <string>imessage:watch</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/HackPrinceton</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

### 4. Filter Group Messages
Currently, group messages are skipped. To enable:

Edit `imageExtract.ts` around line 221:
```typescript
onGroupMessage: async (message: Message) => {
  console.log(`\n👥 Group message from ${message.sender}`);
  // Process group messages too
  const imageCount = await processMessage(sdk, message);
  if (imageCount > 0) {
    console.log(`✅ Processed ${imageCount} image(s) from group\n`);
  }
}
```

### 5. Customize Acknowledgment Messages
Edit line 150 in `imageExtract.ts`:
```typescript
await sdk.send(message.sender, {
  text: `📸 Got your receipt! Processing... 🤖`
  // Or: text: `Thanks! Receipt #${imageCount} received.`
});
```

## 📊 Integration with Dashboard

The processed receipts are automatically available via API:

```typescript
// Fetch all receipts
const response = await fetch('/api/receipts');
const { receipts, stats } = await response.json();

// Filter by date
const recent = await fetch('/api/receipts?startDate=2024-01-01');

// Get statistics
const stats = await fetch('/api/receipts/stats');
```

See `README.md` for full API documentation.

## 🎯 Use Cases

1. **Personal Expense Tracking**
   - Send receipts to yourself
   - Auto-categorize and track spending

2. **Business Expense Reports**
   - Employees send receipts to company number
   - Automatic processing and categorization

3. **Family Budget Management**
   - All family members send receipts
   - Consolidated spending analytics

4. **Receipt Backup**
   - Just save images without processing
   - `IMESSAGE_AUTO_PROCESS=false`

---

**Start monitoring your receipts now!** 🚀

```bash
npm run imessage:watch
```


