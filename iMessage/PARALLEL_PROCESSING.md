# Parallel Processing

The image extractor now processes multiple receipts in parallel for better performance.

## How It Works

When multiple images are found in messages:

```
Collect all images
    ↓
Group into batches (max 5 concurrent)
    ↓
Process batch 1 in parallel:
  ├─ Image 1: Validate → Process
  ├─ Image 2: Validate → Process
  ├─ Image 3: Validate → Process
  ├─ Image 4: Validate → Process
  └─ Image 5: Validate → Process
    ↓
Wait for batch 1 to complete
    ↓
Process batch 2 in parallel:
  ├─ Image 6: Validate → Process
  └─ Image 7: Validate → Process
    ↓
All done!
```

## Configuration

Set in `.env`:

```bash
# Maximum concurrent processing (default: 5)
MAX_PARALLEL_PROCESSING=5
```

## Benefits

- ⚡ **Faster processing** - Multiple receipts processed simultaneously
- 🎯 **Better throughput** - Handle bursts of messages efficiently
- 🔄 **Non-blocking** - One failure doesn't stop others
- 📊 **Progress tracking** - See success/failure counts

## Example

User sends 10 receipt images:

```
📦 Processing 10 image(s) in parallel (max 5 concurrent)...

Batch 1 (5 images):
  ✅ Image 1 validated and processed
  ✅ Image 2 validated and processed
  ❌ Image 3 validation failed (not a receipt)
  ✅ Image 4 validated and processed
  ✅ Image 5 validated and processed

Batch 2 (5 images):
  ✅ Image 6 validated and processed
  ✅ Image 7 validated and processed
  ✅ Image 8 validated and processed
  ❌ Image 9 validation failed (too blurry)
  ✅ Image 10 validated and processed

📊 Processing complete:
   ✅ Success: 8
   ❌ Failed: 2
```

## Processing Flow

For each image:
1. **Validate** with xAI (checks if receipt, clear, readable)
2. **Save** image to `saved-images/`
3. **Process** with xAI (extract data)
4. **Send** feedback to user

All steps happen in parallel for multiple images!

## Error Handling

- ✅ Uses `Promise.allSettled()` - one failure doesn't stop others
- ✅ Each image processed independently
- ✅ Errors logged but don't block other images
- ✅ Success/failure counts tracked

## Performance

- **Sequential**: 10 images × 5 seconds = 50 seconds
- **Parallel (5)**: 10 images ÷ 5 × 5 seconds = 10 seconds
- **5x faster!** 🚀

