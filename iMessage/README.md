# 📱 iMessage Receipt Watcher

Automatically monitors iMessage for receipt images and processes them with xAI Grok Vision.

## 🚀 Features

- ✅ **Continuous Monitoring** - Watches for new iMessage receipts in real-time
- ✅ **Duplicate Prevention** - Hashes messages to avoid reprocessing
- ✅ **Auto-Processing** - Automatically sends images to xAI Grok
- ✅ **Flexible Filtering** - Accept from specific number or all senders
- ✅ **Environment Config** - All settings in `.env` file
- ✅ **History Tracking** - Maintains processed message history (gitignored)

## ⚙️ Configuration

Add these variables to your root `.env` file:

```bash
# Target phone number (leave empty for ALL senders)
IMESSAGE_TARGET_NUMBER=+1234567890

# Keep watching for new messages (true/false)
IMESSAGE_WATCH_MODE=true

# Auto-process receipts with xAI (true/false)
IMESSAGE_AUTO_PROCESS=true
```

## 📖 Usage

### Continuous Watching (Recommended)

```bash
# From project root
npm run imessage:watch

# Or from iMessage directory
cd iMessage
tsx imageExtract.ts
```

This will:
1. Load message history
2. Start watching for new messages
3. Process images automatically
4. Save to `saved-images/`
5. Send to xAI Grok if `AUTO_PROCESS=true`
6. Keep running until you press Ctrl+C

### One-Time Processing

```bash
# Process recent messages once and exit
npm run imessage:once
```

## 🔄 How It Works

```
┌─────────────────────────────────────────────────────┐
│  1. iMessage receives receipt image                 │
│     ↓                                                │
│  2. imageExtract.ts detects new message             │
│     ↓                                                │
│  3. Check if already processed (hash comparison)    │
│     ↓                                                │
│  4. Save image to saved-images/                     │
│     ↓                                                │
│  5. Add hash to .message-history.json               │
│     ↓                                                │
│  6. [If AUTO_PROCESS] Send to xAI Grok              │
│     ↓                                                │
│  7. Send acknowledgment to sender                   │
│     ↓                                                │
│  8. Continue watching for next message...           │
└─────────────────────────────────────────────────────┘
```

## 📝 Message History

The watcher maintains a `.message-history.json` file with:
- SHA-256 hashes of processed messages
- SHA-256 hashes of processed attachments
- Last processed timestamp

This file is:
- ✅ Automatically created on first run
- ✅ Gitignored (won't be committed)
- ✅ Updated after each message
- ✅ Used to prevent duplicate processing

## 🎯 Filtering Options

### Accept from Specific Number

```bash
# .env
IMESSAGE_TARGET_NUMBER=+1234567890
```

Only processes messages from this number.

### Accept from All Senders

```bash
# .env
IMESSAGE_TARGET_NUMBER=
```

Processes receipts from anyone (leave empty).

## 🤖 Auto-Processing

When `IMESSAGE_AUTO_PROCESS=true`:

1. Image saved to `saved-images/`
2. Automatically sent to xAI Grok Vision
3. JSON output saved to `xAI/processed-receipts/`
4. Sender receives confirmation message

When `IMESSAGE_AUTO_PROCESS=false`:

1. Image saved only
2. Manual processing required: `npm run receipt:process`

## 📊 Output

### Saved Images
```
iMessage/saved-images/
├── receipt-1699388400000-IMG_1234.jpg
├── receipt-1699388401000-photo.jpg
└── ...
```

### Message History
```
iMessage/.message-history.json
{
  "processedHashes": [
    "a1b2c3d4e5f6...",
    "7890abcdef12..."
  ],
  "lastProcessed": "2024-11-08T14:30:00.000Z"
}
```

## 🔒 Security & Privacy

- ✅ Only reads from local iMessage database
- ✅ No data sent to external servers (except xAI for processing)
- ✅ Message history stored locally (gitignored)
- ✅ Respects macOS permissions
- ✅ Optional sender filtering

## ⚠️ Requirements

- **OS:** macOS only (accesses iMessage database)
- **Runtime:** Node.js >= 18.0.0
- **Permissions:** Read access to `~/Library/Messages/chat.db`
- **Full Disk Access** may be required (System Settings → Privacy & Security → Full Disk Access)

## 🛑 Stopping the Watcher

Press `Ctrl+C` to gracefully shut down:

```
🛑 Shutting down gracefully...
✅ Stopped watching. History saved.
```

## 🎛️ Advanced Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `IMESSAGE_TARGET_NUMBER` | `""` | Phone number filter (empty = all) |
| `IMESSAGE_WATCH_MODE` | `true` | Continuous watching |
| `IMESSAGE_AUTO_PROCESS` | `true` | Auto-send to xAI |

### Script Options

```bash
# Watch mode with debug logging
DEBUG=* npm run imessage:watch

# One-time processing without watching
npm run imessage:once

# Custom environment
IMESSAGE_TARGET_NUMBER=+1234567890 IMESSAGE_AUTO_PROCESS=false npm run imessage:watch
```

## 📋 Example Workflow

1. **Setup:**
   ```bash
   cp .env.example .env
   # Edit .env and set IMESSAGE_TARGET_NUMBER
   ```

2. **Start Watcher:**
   ```bash
   npm run imessage:watch
   ```

3. **Send Receipt:**
   - Take photo of receipt
   - Send via iMessage to yourself or configured number

4. **Automatic Processing:**
   ```
   📨 New message from +1234567890
   ✅ Saved new image: receipt-1699388400000-IMG_1234.jpg
   🤖 Auto-processing receipt with xAI Grok...
   ✨ Receipt processed successfully!
   📸 Sent acknowledgment to sender
   ```

5. **View Results:**
   ```bash
   # See extracted data
   cat xAI/processed-receipts/receipt-1699388400000-IMG_1234.json
   
   # View statistics
   npm run receipt:stats
   ```

## 🐛 Troubleshooting

### "No messages found"
- Check iMessage database permissions
- Verify target number format
- Try leaving `IMESSAGE_TARGET_NUMBER` empty

### "Access denied to Messages database"
- Grant Full Disk Access to Terminal/iTerm
- System Settings → Privacy & Security → Full Disk Access

### "Duplicate images being saved"
- Message history may be corrupted
- Delete `.message-history.json` and restart

### Images not auto-processing
- Check `IMESSAGE_AUTO_PROCESS=true` in `.env`
- Verify xAI API key is configured
- Check xAI directory exists and has dependencies

## 💡 Tips

- 🎯 **Test first** with one-time mode: `npm run imessage:once`
- 📱 **Send yourself** a test receipt image
- 👀 **Monitor logs** for processing status
- 🔄 **Restart watcher** if you update `.env`
- 📊 **Check stats** regularly: `npm run receipt:stats`

## 🚀 Production Deployment

For always-on receipt monitoring:

```bash
# Using PM2
pm2 start "npm run imessage:watch" --name receipt-watcher

# Using systemd (create service file)
[Unit]
Description=iMessage Receipt Watcher

[Service]
ExecStart=/usr/local/bin/npm run imessage:watch
WorkingDirectory=/path/to/HackPrinceton
Restart=always

[Install]
WantedBy=multi-user.target
```

---

**Ready to monitor receipts automatically!** 🎉

Start the watcher: `npm run imessage:watch`


