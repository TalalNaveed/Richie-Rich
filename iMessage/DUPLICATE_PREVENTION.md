# Duplicate Prevention

The system now prevents reprocessing the same images using filename tracking.

## How It Works

```
Image arrives
    ↓
Check filename: "receipt.jpg"
    ↓
┌─────────────────────────────┐
│  Already in .processed-images.json? │
│  OR already in saved-images/ folder? │
└─────────────────────────────┘
    ↓
    YES → Skip (already processed)
    NO  → Process normally
    ↓
After processing → Add to .processed-images.json
```

## Tracking Methods

### 1. Filename Tracking
- Stores processed filenames in `.processed-images.json`
- Checks this file before processing
- Updates after each successful processing

### 2. File Existence Check
- Also checks if file already exists in `saved-images/`
- If exists, marks as processed and skips
- Double protection against duplicates

## File Structure

```
iMessage/
├── .processed-images.json    # Tracks processed filenames (gitignored)
├── saved-images/            # Actual saved images
│   ├── receipt1.jpg         # If exists, won't reprocess
│   └── receipt2.jpg
└── imageExtract.ts          # Main processor
```

## Example

**First run:**
```
Found image: receipt.jpg
✅ Not processed yet
✅ Validation passed
✅ Saved to saved-images/receipt.jpg
✅ Added to .processed-images.json
```

**Second run (same unread message):**
```
Found image: receipt.jpg
⏭️  Skipping receipt.jpg - already processed
```

**Third run:**
```
Found image: receipt.jpg
⏭️  Skipping receipt.jpg - file already exists
```

## Benefits

- ✅ No reprocessing same images
- ✅ Works even if message stays unread
- ✅ Fast filename lookup
- ✅ Persistent across restarts
- ✅ Gitignored (won't be committed)

## Reset Tracking

To reprocess all images:

```bash
# Delete tracking file
rm iMessage/.processed-images.json

# Or delete saved images
rm -rf iMessage/saved-images/*
```

## File Format

`.processed-images.json`:
```json
{
  "processedFilenames": [
    "receipt1.jpg",
    "receipt2.jpg",
    "IMG_1234.JPG"
  ],
  "lastUpdated": "2024-11-08T14:30:00.000Z"
}
```

