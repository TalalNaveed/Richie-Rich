# Image Hash-Based Duplicate Prevention

The system now uses SHA-256 hashing of image content to prevent duplicates.

## How It Works

```
Image arrives
    ↓
Generate SHA-256 hash of image content
    ↓
Check hash in .processed-images.json
    ↓
┌─────────────────────────────┐
│  Hash exists?                │
└─────────────────────────────┘
    ↓
    YES → Skip (already processed)
    NO  → Continue
    ↓
Also check existing files in saved-images/
    ↓
Compare hashes of existing files
    ↓
If match found → Skip
If no match → Process
    ↓
After processing → Save hash to .processed-images.json
```

## Hash Generation

Uses SHA-256 hash of:
- **Primary**: Full file content (most reliable)
- **Fallback**: Path + file size + modification time (if read fails)

## Benefits Over Filename

- ✅ **Same image, different name** → Detected as duplicate
- ✅ **Renamed file** → Still detected
- ✅ **Content-based** → More reliable than filename
- ✅ **Cross-platform** → Works regardless of file system

## Example

**Same image sent twice:**
```
First run:
  Image: receipt.jpg
  Hash: a1b2c3d4e5f6...
  ✅ Process → Save hash

Second run:
  Image: receipt.jpg (same content)
  Hash: a1b2c3d4e5f6... (same hash!)
  ⏭️  Skipping - hash already processed
```

**Same image, different filename:**
```
First run:
  Image: IMG_1234.jpg
  Hash: a1b2c3d4e5f6...
  ✅ Process

Second run:
  Image: receipt.jpg (same content, different name)
  Hash: a1b2c3d4e5f6... (same hash!)
  ⏭️  Skipping - duplicate image exists
```

## File Format

`.processed-images.json`:
```json
{
  "processedHashes": [
    "a1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789",
    "9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba"
  ],
  "lastUpdated": "2024-11-08T14:30:00.000Z"
}
```

## Reset Tracking

```bash
# Delete tracking file
rm iMessage/.processed-images.json

# Or delete saved images
rm -rf iMessage/saved-images/*
```

