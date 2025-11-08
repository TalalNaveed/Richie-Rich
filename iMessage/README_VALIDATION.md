# Image Validation System

## Overview

Before processing receipts, images are validated using xAI Grok Vision to ensure they are:
- ✅ Actually receipts (not random photos)
- ✅ Clear enough to read
- ✅ Extractable (can get data from them)

## How It Works

```
User sends image
    ↓
imageValidator.ts checks image
    ↓
┌─────────────────────────────────────┐
│  Validation Results:                │
│                                     │
│  ✅ Valid Receipt → Process         │
│  ❌ Not Receipt → Ask for receipt   │
│  ❌ Too Blurry → Ask for clearer    │
│  ❌ Unreadable → Ask for better     │
└─────────────────────────────────────┘
    ↓
If valid → Continue to processing
If invalid → Send feedback, skip
```

## Validation Messages

| Result | User Sees |
|--------|-----------|
| Valid Receipt | "✅ Receipt received and processed!" |
| Not a Receipt | "This does not appear to be a receipt. Please send a receipt image." |
| Too Blurry | "Image is too blurry to process. Please send a clearer photo of the receipt." |
| Unreadable | "Cannot read the receipt. Please send a clearer, well-lit photo." |

## Files

- **`imageValidator.ts`** - Validation logic (uses xAI Grok)
- **`imageExtract.ts`** - Main processor (calls validator first)

## Usage

The validation happens automatically when you run:

```bash
npm run imessage:process
```

The validator is called BEFORE any image processing, so users get immediate feedback if their image isn't suitable.

## Validation Criteria

xAI checks:
1. **isReceipt** - Is this actually a receipt?
2. **isClear** - Is the image clear enough?
3. **canExtract** - Can we extract data from it?

All three must be `true` for validation to pass.

