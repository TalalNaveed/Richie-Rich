# iMessage Poller

Simple polling script that runs the image extractor every 2 seconds.

## How It Works

```
Start poller
    ↓
Run imageExtract.ts immediately
    ↓
Wait 2 seconds
    ↓
Run imageExtract.ts again
    ↓
Repeat forever...
```

## Usage

```bash
# Start the poller
npm run imessage:poll
```

The poller will:
- ✅ Run `imageExtract.ts` every 2 seconds
- ✅ Only process unread messages (handled by imageExtract.ts)
- ✅ Skip if previous run is still in progress
- ✅ Continue running until you press Ctrl+C

## What Happens

1. **First run** - Processes any unread messages immediately
2. **Every 2 seconds** - Checks for new unread messages
3. **If no messages** - Script exits quickly, poller continues
4. **If messages found** - Processes them, then waits 2 seconds

## Output Example

```
🚀 Starting iMessage Poller
📁 Script: /path/to/imageExtract.ts
⏱️  Poll interval: 2000ms (2 seconds)

🔄 [14:30:00] Running image extract...
Looking for messages from: ALL
Found 1 message(s)
🔍 Validating image: receipt.jpg
✅ Validation passed
✅ Saved image to saved-images/receipt.jpg
✅ Successfully processed 1 receipt image(s)

🔄 [14:30:02] Running image extract...
Looking for messages from: ALL
No messages found

🔄 [14:30:04] Running image extract...
...
```

## Stop the Poller

Press `Ctrl+C` to stop gracefully.

## Why This Instead of Watcher?

- ✅ More reliable (doesn't break like the watcher)
- ✅ Simple polling mechanism
- ✅ Easy to debug
- ✅ Can see each run in logs

## Configuration

The poller uses the same `.env` settings as `imageExtract.ts`:
- `IMESSAGE_TARGET_NUMBER` - Filter by phone number
- `IMESSAGE_AUTO_PROCESS` - Auto-process with xAI
- `XAI_API_KEY` - For validation and processing

## Notes

- The script runs every 2 seconds regardless of whether there are messages
- If there are no unread messages, the script exits quickly
- Previous runs won't overlap (waits for completion)
- Timeout is 30 seconds per run (prevents hanging)

