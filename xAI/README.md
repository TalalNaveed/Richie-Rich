# Receipt Processor with xAI Grok Vision

This module uses **xAI's Grok Vision API** (from X/Twitter) to extract structured data from receipt images.

## 🚀 Quick Start

```bash
cd xAI
npm run setup          # Install and configure
npm run test           # Verify setup
npm run process        # Process all receipts
```

## 📋 Prerequisites

- Node.js v18+ 
- **xAI API key** with Grok Vision access (from X/Twitter)
- Receipt images in `/iMessage/saved-images/`

Get your xAI API key at: [https://x.ai/api](https://x.ai/api) or [https://console.x.ai](https://console.x.ai)

## 🔧 Setup

### Option 1: Setup from Project Root (Recommended)

```bash
# From project root
npm run setup
cp .env.example .env
# Edit .env and add: XAI_API_KEY=your-xai-key-here
```

### Option 2: Setup xAI Module Directly

```bash
cd xAI
npm run setup
```

This will:
- ✅ Install all dependencies
- ✅ Create required directories
- ✅ Check for root `.env` file

**Note:** The module uses the `.env` file from the **project root**, not a local `.env` file.

## ✅ Verify Setup

```bash
npm run test
```

This runs a comprehensive test suite checking:
- Node.js version
- OpenAI API key validity
- API connectivity
- Directory structure
- Dependencies
- File permissions

## 📸 Usage

### Process all receipts from saved-images directory:

```bash
npm run process
```

This will:
- Read all images from `../iMessage/saved-images/`
- Process each image using **xAI Grok Vision**
- Extract structured receipt data
- Save individual JSON files for each receipt
- Create an `all-receipts.json` with all results

### Process a single receipt:

```typescript
import { processSingleReceipt } from './receiptProcessor';

const data = await processSingleReceipt('receipt-001.jpg');
console.log(data);
```

## Output Format

Each receipt is parsed into the following JSON structure:

```json
{
  "merchantName": "Store Name",
  "merchantAddress": "123 Main St, City, ST 12345",
  "date": "2024-01-15",
  "time": "14:30",
  "items": [
    {
      "name": "Product Name",
      "quantity": 2,
      "price": 10.99,
      "total": 21.98
    }
  ],
  "subtotal": 21.98,
  "tax": 1.76,
  "tip": 5.00,
  "total": 28.74,
  "paymentMethod": "Credit Card",
  "lastFourDigits": "1234",
  "receiptNumber": "REC-001",
  "categoryTags": ["food", "restaurant"]
}
```

## Output Location

Processed receipts are saved to: `xAI/processed-receipts/`

- Individual receipt JSON files: `processed-receipts/{filename}.json`
- Combined results: `processed-receipts/all-receipts.json`

## API Model

This uses **xAI's `grok-vision-beta`** model which includes vision capabilities. Make sure you have access to Grok Vision in your xAI account.

## Error Handling

- If an image cannot be processed, it will be logged and skipped
- Invalid images or non-receipt images may return partial data or null
- All errors are logged for debugging

## Rate Limiting

The script includes a 1-second delay between processing each image to avoid API rate limits.

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get started in 5 minutes
- **[INTEGRATION.md](./INTEGRATION.md)** - Full integration guide with Next.js
- **[README.md](./README.md)** - This file (comprehensive reference)

## 🧪 Testing

Run the test suite to verify everything is configured correctly:

```bash
npm run test
```

## 📊 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | Install dependencies and configure |
| `npm run test` | Run test suite |
| `npm run process` | Process all receipts |
| `npm run process:single <file>` | Process single receipt |
| `npm run stats` | View statistics |
| `npm run example` | Run example usage |

## 🌐 API Integration

This module provides Next.js API routes:

- `GET /api/receipts` - Get all receipts (with filtering)
- `POST /api/receipts` - Upload new receipt
- `GET /api/receipts/stats` - Get statistics

See [INTEGRATION.md](./INTEGRATION.md) for details.

## 📦 Exports

### Functions

```typescript
// Process all receipts
import processAllReceipts from './receiptProcessor';
await processAllReceipts();

// Process single receipt
import { processSingleReceipt } from './receiptProcessor';
const data = await processSingleReceipt('receipt.jpg');

// Get all receipts
import { getAllReceipts } from './apiIntegration';
const receipts = getAllReceipts();

// Filter receipts
import { getReceiptsByCategory } from './apiIntegration';
const foodReceipts = getReceiptsByCategory('food');

// Get statistics
import { getReceiptStats } from './apiIntegration';
const stats = getReceiptStats(receipts);
```

### Types

```typescript
import { ReceiptData, ReceiptItem } from './receiptProcessor';
```

