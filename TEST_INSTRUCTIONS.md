# 🧪 Testing the iMessage Watcher

## Before You Start

1. **Grant Full Disk Access**
   - Go to: System Settings → Privacy & Security → Full Disk Access
   - Add your Terminal/IDE (Terminal, iTerm, VS Code, Cursor, Zed, etc.)
   - Restart your terminal after granting access

2. **Configure Environment**
   ```bash
   # Edit .env
   cp .env.example .env
   
   # Add your xAI key
   XAI_API_KEY=your-xai-key-here
   
   # Optional: Filter by phone number (leave empty for ALL)
   IMESSAGE_TARGET_NUMBER=
   
   # Enable watching and auto-processing
   IMESSAGE_WATCH_MODE=true
   IMESSAGE_AUTO_PROCESS=true
   ```

## Testing Steps

### Test 1: One-Time Mode
```bash
# Process existing unread messages once
npm run imessage:once
```

**Expected Output:**
```
🚀 iMessage Receipt Watcher Starting...
📥 Fetching recent UNREAD messages (one-time)...
Found X unread message(s)
...
✅ Done!
```

### Test 2: Continuous Watching
```bash
# Start the watcher
npm run imessage:watch
```

**Expected Output:**
```
🚀 iMessage Receipt Watcher Starting...
Configuration:
  Target Number: ALL (any sender)
  Watch Mode: CONTINUOUS
  Auto-Process: ENABLED

📋 Loaded history: 0 processed messages
👀 Watching for UNREAD messages with images...
💡 Send a receipt image via iMessage to test!
```

### Test 3: Send Test Message

1. **Keep the watcher running**
2. **Send yourself a message** with an image via iMessage
3. **Watch the terminal** for output

**Expected When Image Arrives:**
```
📨 New message from +1234567890
   Date: 2024-11-08T...
   Read: NO
   Attachments: 1
📸 Found image(s) - processing...
   Processing 1 attachment(s)...
   - Checking: IMG_1234.JPG
     Type: image/jpeg
     ✓ Is an image!
     ✅ Saved: receipt-1699388400000.jpg
     🤖 Auto-processing with xAI...
     ✨ Processing complete!
     📤 Sent acknowledgment

✅ Processed 1 new image(s)
```

## Troubleshooting

### ❌ "No messages found"
**Fix:** Make sure you have UNREAD messages with images

### ❌ "Access denied to Messages database"
**Fix:** Grant Full Disk Access to your Terminal/IDE and restart

### ❌ "Attachments: 0" but you sent an image
**Possible causes:**
- Image not fully downloaded yet (wait a few seconds)
- Message is already marked as read
- Using wrong phone number filter

**Debug:**
```bash
# Check if image is in iMessage database
ls -la ~/Library/Messages/Attachments/
```

### ❌ Watcher not detecting new messages
**Fix:** 
1. Stop the watcher (Ctrl+C)
2. Send a new UNREAD message
3. Start watcher again

### ✅ Message detected but "No images"
**Check:** Make sure you're sending an actual image file
- Photos/Pictures work ✓
- Screenshots work ✓
- Links to images don't work ✗

## What Should Happen

1. **Watcher starts** ✓
2. **You send unread message with image** ✓
3. **Watcher detects it** (within 2 seconds) ✓
4. **Image is saved** to `iMessage/saved-images/` ✓
5. **xAI processes it** (if AUTO_PROCESS=true) ✓
6. **JSON saved** to `xAI/processed-receipts/` ✓
7. **You receive confirmation** message ✓

## Quick Debug

```bash
# Check if watcher is running
ps aux | grep imageExtract

# Check saved images
ls -la iMessage/saved-images/

# Check processed receipts
ls -la xAI/processed-receipts/

# Check history
cat iMessage/.message-history.json

# View recent logs
npm run imessage:watch 2>&1 | tee imessage.log
```

## Success Criteria

- [ ] Watcher starts without errors
- [ ] Detects new UNREAD messages
- [ ] Identifies image attachments
- [ ] Saves images to folder
- [ ] Avoids duplicates
- [ ] Auto-processes with xAI (if enabled)
- [ ] Sends acknowledgment

## Common Issues

| Issue | Solution |
|-------|----------|
| "Full Disk Access required" | Grant in System Settings |
| "Database locked" | Close Messages app |
| "No new messages" | Make sure message is UNREAD |
| "Image not detected" | Check MIME type in logs |
| "Duplicate processing" | Delete .message-history.json |

---

**Still not working?** Check the detailed logs above for specific error messages.
