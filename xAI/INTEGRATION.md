# Receipt Processing Integration Guide

This guide explains how to integrate the Vision AI receipt processor with your Next.js application.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Your App Flow                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. iMessage receives receipt image                          │
│     ↓                                                         │
│  2. imageExtract.ts saves to /iMessage/saved-images/         │
│     ↓                                                         │
│  3. receiptProcessor.ts (xAI) processes with GPT-4 Vision    │
│     ↓                                                         │
│  4. Structured JSON saved to /xAI/processed-receipts/        │
│     ↓                                                         │
│  5. Next.js API routes serve data to frontend                │
│     ↓                                                         │
│  6. Dashboard displays receipt analytics                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Setup Steps

### 1. Install Dependencies

```bash
cd xAI
npm run setup
```

Or manually:

```bash
cd xAI
npm install
```

### 2. Configure OpenAI API Key

Create a `.env` file in the `xAI` directory:

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 3. Process Receipt Images

Once you have images in `/iMessage/saved-images/`, run:

```bash
npm run process
```

This will:
- Read all images from the saved-images directory
- Send them to OpenAI GPT-4 Vision API
- Extract structured receipt data
- Save JSON files to `processed-receipts/`

## API Endpoints

### GET /api/receipts

Get all receipts with optional filtering.

**Query Parameters:**
- `merchant` - Filter by merchant name (partial match)
- `category` - Filter by category tag
- `startDate` - Filter receipts after this date (YYYY-MM-DD)
- `endDate` - Filter receipts before this date (YYYY-MM-DD)

**Example:**
```bash
curl http://localhost:3000/api/receipts?merchant=starbucks
curl http://localhost:3000/api/receipts?category=food&startDate=2024-01-01
```

**Response:**
```json
{
  "receipts": [
    {
      "merchantName": "Starbucks",
      "date": "2024-01-15",
      "total": 12.50,
      "items": [...],
      "categoryTags": ["food", "coffee"]
    }
  ],
  "stats": {
    "total": 1,
    "totalSpending": 12.50,
    "totalTax": 1.00,
    "totalTips": 2.00
  }
}
```

### POST /api/receipts

Upload a new receipt image for processing.

**Example:**
```bash
curl -X POST http://localhost:3000/api/receipts \
  -F "image=@receipt.jpg"
```

**Response:**
```json
{
  "message": "Receipt uploaded successfully",
  "filename": "upload-1234567890-receipt.jpg",
  "note": "Run the receipt processor to extract data from this image"
}
```

### GET /api/receipts/stats

Get comprehensive statistics about all receipts.

**Response:**
```json
{
  "totalReceipts": 25,
  "totalSpending": 1234.56,
  "averageSpending": 49.38,
  "totalTax": 98.76,
  "totalTips": 123.45,
  "byCategory": {
    "food": 456.78,
    "groceries": 234.56,
    "retail": 543.22
  },
  "byMerchant": {
    "Starbucks": { "count": 5, "total": 62.50 }
  },
  "byMonth": {
    "2024-01": 567.89,
    "2024-02": 666.67
  },
  "topMerchants": [...],
  "recentReceipts": [...]
}
```

## Integration with Dashboard

### Example: React Component

```typescript
import { useEffect, useState } from 'react';

interface ReceiptData {
  merchantName: string;
  date: string;
  total: number;
  items: any[];
  categoryTags?: string[];
}

export function ReceiptsDashboard() {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // Fetch all receipts
    fetch('/api/receipts')
      .then(res => res.json())
      .then(data => setReceipts(data.receipts));

    // Fetch stats
    fetch('/api/receipts/stats')
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  return (
    <div>
      <h1>Receipt Analytics</h1>
      
      {stats && (
        <div>
          <p>Total Spending: ${stats.totalSpending.toFixed(2)}</p>
          <p>Total Receipts: {stats.totalReceipts}</p>
          <p>Average: ${stats.averageSpending.toFixed(2)}</p>
        </div>
      )}

      <div>
        {receipts.map((receipt, i) => (
          <div key={i}>
            <h3>{receipt.merchantName}</h3>
            <p>{receipt.date} - ${receipt.total}</p>
            <p>Items: {receipt.items.length}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Programmatic Usage

### Using the Processor Functions

```typescript
import processAllReceipts, { processSingleReceipt } from './xAI/receiptProcessor.js';

// Process all images
await processAllReceipts();

// Process a single image
const data = await processSingleReceipt('receipt-001.jpg');
console.log(data);
```

### Using the API Integration Functions

```typescript
import {
  getAllReceipts,
  getReceiptsByDateRange,
  getReceiptsByCategory,
  calculateTotalSpending,
  getSpendingSummaryByCategory,
  getReceiptStats,
  exportToCSV
} from './xAI/apiIntegration.js';

// Get all receipts
const receipts = getAllReceipts();

// Filter by date
const recentReceipts = getReceiptsByDateRange(
  new Date('2024-01-01'),
  new Date('2024-12-31')
);

// Get receipts by category
const foodReceipts = getReceiptsByCategory('food');

// Calculate spending
const totalSpent = calculateTotalSpending(receipts);

// Get category breakdown
const categorySpending = getSpendingSummaryByCategory(receipts);

// Get detailed statistics
const stats = getReceiptStats(receipts);

// Export to CSV
exportToCSV(receipts, './receipts-export.csv');
```

## Automated Workflow

To automate the entire process, you can create a workflow script:

```typescript
// workflow.ts
import { processAndSaveImages } from './iMessage/imageExtract.js';
import processAllReceipts from './xAI/receiptProcessor.js';

async function automaticReceiptProcessing(phoneNumber: string) {
  console.log('Step 1: Fetching images from iMessage...');
  await processAndSaveImages(phoneNumber);
  
  console.log('Step 2: Processing receipts with Vision AI...');
  await processAllReceipts();
  
  console.log('Done! Receipts are now available via API.');
}

// Run every hour or on demand
automaticReceiptProcessing('+1234567890');
```

## Data Format

### Receipt JSON Structure

```typescript
interface ReceiptData {
  merchantName: string;           // "Starbucks"
  merchantAddress?: string;        // "123 Main St..."
  date: string;                    // "2024-01-15"
  time?: string;                   // "14:30"
  items: Array<{
    name: string;                  // "Latte"
    quantity: number;              // 1
    price: number;                 // 5.50
    total: number;                 // 5.50
  }>;
  subtotal: number;                // 5.50
  tax: number;                     // 0.50
  tip?: number;                    // 1.00
  total: number;                   // 7.00
  paymentMethod?: string;          // "Credit Card"
  lastFourDigits?: string;         // "1234"
  receiptNumber?: string;          // "REC-001"
  categoryTags?: string[];         // ["food", "coffee"]
}
```

## Troubleshooting

### No receipts showing up

1. Check that images exist in `/iMessage/saved-images/`
2. Verify OpenAI API key is set correctly
3. Run `npm run process` manually to see errors

### OpenAI API errors

- Ensure you have GPT-4 Vision API access
- Check your API key has sufficient credits
- Verify you're using the correct model: `gpt-4o`

### Image processing fails

- Ensure images are in supported formats: JPG, PNG, GIF, WEBP
- Check image quality - too blurry images won't work well
- Verify the image actually contains a receipt

## Cost Considerations

- GPT-4 Vision API costs approximately $0.01-0.03 per image
- Processing 100 receipts ≈ $1-3
- Consider caching results to avoid reprocessing

## Next Steps

1. Customize the receipt data structure for your needs
2. Add more filtering options to the API
3. Create visualizations in your dashboard
4. Set up automatic processing on new iMessage images
5. Implement receipt categorization rules
6. Add export features (PDF, Excel, etc.)



