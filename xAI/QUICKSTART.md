# Quick Start Guide

Get started with receipt processing in 5 minutes!

## Prerequisites

- Node.js installed (v18+)
- **xAI API key** with Grok Vision access (from X/Twitter)
- Receipt images in `/iMessage/saved-images/` directory

Get your xAI API key: [https://x.ai/api](https://x.ai/api) or [https://console.x.ai](https://console.x.ai)

## Installation

```bash
# From project root (recommended)
npm run setup

# Or from xAI directory
cd xAI
npm run setup
```

## Configuration

Edit the `.env` file **at the project root** and add your xAI API key:

```bash
# In the root .env file (not xAI/.env)
XAI_API_KEY=your-actual-xai-api-key-here
```

**Important:** This module uses the `.env` file from the project root directory and connects to **xAI Grok Vision** (not OpenAI).

## Usage

### Process All Receipts

```bash
npm run process
```

This will:
1. ✅ Find all images in `/iMessage/saved-images/`
2. 🤖 Send each image to **xAI Grok Vision API**
3. 📝 Extract structured receipt data
4. 💾 Save JSON files to `/processed-receipts/`

### View Statistics

```bash
npm run stats
```

Shows summary statistics:
- Total spending
- Breakdown by category
- Top merchants
- Monthly trends

### Process Single Receipt

```bash
npm run process:single receipt-001.jpg
```

### Example Output

After processing, you'll find:

**Individual receipts:**
```
processed-receipts/
  ├── receipt-001.json
  ├── receipt-002.json
  └── ...
```

**Combined file:**
```
processed-receipts/
  └── all-receipts.json
```

**Sample receipt JSON:**
```json
{
  "merchantName": "Starbucks",
  "merchantAddress": "123 Main Street, Seattle, WA 98101",
  "date": "2024-01-15",
  "time": "09:45",
  "items": [
    {
      "name": "Grande Latte",
      "quantity": 1,
      "price": 5.50,
      "total": 5.50
    },
    {
      "name": "Blueberry Muffin",
      "quantity": 1,
      "price": 3.50,
      "total": 3.50
    }
  ],
  "subtotal": 9.00,
  "tax": 0.81,
  "tip": 2.00,
  "total": 11.81,
  "paymentMethod": "Credit Card",
  "lastFourDigits": "1234",
  "receiptNumber": "123-456-789",
  "categoryTags": ["food", "coffee", "restaurant"]
}
```

## Using in Your App

### Fetch Receipts in Next.js

```typescript
// In your React component
const [receipts, setReceipts] = useState([]);

useEffect(() => {
  fetch('/api/receipts')
    .then(res => res.json())
    .then(data => setReceipts(data.receipts));
}, []);
```

### Upload New Receipt

```typescript
async function uploadReceipt(file: File) {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch('/api/receipts', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  console.log(result);
}
```

### Get Statistics

```typescript
const [stats, setStats] = useState(null);

useEffect(() => {
  fetch('/api/receipts/stats')
    .then(res => res.json())
    .then(data => setStats(data));
}, []);
```

## Common Commands

```bash
# Setup environment
npm run setup

# Process all receipts
npm run process

# View statistics
npm run stats

# Run example
npm run example
```

## Testing with Sample Receipt

1. Take a photo of any receipt
2. Save it to `/iMessage/saved-images/test-receipt.jpg`
3. Run: `npm run process:single test-receipt.jpg`
4. Check the output in `/processed-receipts/test-receipt.json`

## Troubleshooting

**"No images found"**
- Make sure images are in `/iMessage/saved-images/`
- Check file extensions: .jpg, .jpeg, .png, .gif, .webp

**"xAI API error"**
- Verify API key in `.env` file
- Ensure you have xAI Grok Vision access
- Check your xAI account and credits
- Verify API endpoint: `https://api.x.ai/v1`

**"Failed to parse JSON"**
- Some receipts may be too blurry
- Try with a clearer image
- Check console for detailed error

## Next Steps

1. ✅ Process your first receipt
2. 📊 View stats with `npm run stats`
3. 🌐 Integrate with your Next.js app using the API routes
4. 📈 Build a dashboard to visualize spending
5. 🤖 Automate processing with a cron job

## Need Help?

Check out:
- `README.md` - Full documentation
- `INTEGRATION.md` - Integration guide
- `example.ts` - Code examples
- `apiIntegration.ts` - Utility functions

## Pro Tips

💡 **Batch Processing**: Place multiple receipts in the folder and run `npm run process` once

💡 **Rate Limiting**: The script includes 1-second delays between images to avoid API limits

💡 **xAI Grok**: Using Grok Vision from X/Twitter for powerful image understanding

💡 **Quality Matters**: Clear, well-lit photos work best

💡 **Automatic Categorization**: Grok AI automatically tags receipts with relevant categories

Enjoy automated receipt tracking! 🎉

