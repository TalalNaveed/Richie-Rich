# 🧾 HackPrinceton Project

An intelligent receipt management system that automatically extracts, processes, and analyzes receipt data using **xAI Grok Vision** (from X/Twitter).

## ✨ Features

- 📱 **iMessage Live Monitoring** - Continuously watches for receipt images in iMessage
- 🔄 **Auto-Processing** - Automatically sends new receipts to xAI Grok
- 🚫 **Duplicate Prevention** - Smart hashing avoids reprocessing
- 🤖 **AI-Powered OCR** - Use **xAI Grok Vision** to extract structured data from receipts
- 📊 **Analytics Dashboard** - Visualize spending patterns and trends
- 🏷️ **Auto-Categorization** - Automatically tag receipts by category
- 💰 **Expense Tracking** - Track spending by merchant, category, and time period
- 🌐 **REST API** - Query receipt data programmatically
- 📈 **Real-time Stats** - Get instant insights into your spending
- 📤 **CSV Export** - Export data for external analysis

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone <your-repo>
cd HackPrinceton
npm run setup

# 2. Configure API keys
cp .env.example .env
# Edit .env and add: XAI_API_KEY=your-xai-key-here

# 3. Verify setup
npm run receipt:test

# 4. Start iMessage watcher (runs continuously)
npm run imessage:watch

# 5. Send receipt images via iMessage - they'll auto-process!

# 6. Start the web app
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📋 Prerequisites

- Node.js v18+
- npm or yarn
- **xAI API key** with Grok Vision access (from X/Twitter)
- (Optional) Access to iMessage database on macOS

Get your xAI API key: [https://x.ai/api](https://x.ai/api) or [https://console.x.ai](https://console.x.ai)

## 📁 Project Structure

```
HackPrinceton/
├── app/                    # Next.js application
│   ├── api/
│   │   └── receipts/      # Receipt API endpoints
│   ├── layout.tsx
│   └── page.tsx
├── components/             # React components
│   ├── analytics-dashboard.tsx
│   ├── receipt-insights.tsx
│   └── ui/                # shadcn/ui components
├── iMessage/              # iMessage integration
│   ├── imageExtract.ts    # Extract images from iMessage
│   └── saved-images/      # Extracted receipt images
├── xAI/                   # AI processing module
│   ├── receiptProcessor.ts     # GPT-4 Vision processor
│   ├── apiIntegration.ts       # Data utilities
│   ├── test.ts                 # Test suite
│   ├── README.md               # Module documentation
│   ├── QUICKSTART.md           # Quick start guide
│   ├── INTEGRATION.md          # Integration guide
│   └── processed-receipts/     # Output JSON files
├── lib/                   # Utilities
│   ├── nessie-api.ts     # Capital One Nessie API
│   └── utils.ts
├── .env.example          # Environment variables template
├── .gitignore           # Comprehensive gitignore
├── SETUP.md             # Detailed setup guide
└── package.json         # Dependencies and scripts
```

## 🛠️ Available Commands

### Main Commands

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run setup            # Full project setup
```

### iMessage Monitoring

```bash
npm run imessage:watch        # Start continuous iMessage monitoring
npm run imessage:once         # Process once and exit
```

### Receipt Processing

```bash
npm run receipt:setup         # Setup receipt processor
npm run receipt:test          # Test receipt processor
npm run receipt:process       # Process all receipts
npm run receipt:stats         # View statistics
npm run receipt:example       # Run examples
```

## 🔑 API Keys Required

### xAI Grok (Required)

Get your API key at [https://x.ai/api](https://x.ai/api) or [https://console.x.ai](https://console.x.ai)

```bash
XAI_API_KEY=your-xai-api-key-here
```

### Capital One Nessie (Optional)

Get your API key at [http://api.nessieisreal.com/](http://api.nessieisreal.com/)

```bash
NESSIE_API_KEY=your-nessie-api-key-here
```

## 📊 API Endpoints

### GET /api/receipts

Get all receipts with optional filtering.

```bash
# Get all receipts
curl http://localhost:3000/api/receipts

# Filter by merchant
curl http://localhost:3000/api/receipts?merchant=starbucks

# Filter by category and date
curl http://localhost:3000/api/receipts?category=food&startDate=2024-01-01
```

### POST /api/receipts

Upload a new receipt image.

```bash
curl -X POST http://localhost:3000/api/receipts \
  -F "image=@receipt.jpg"
```

### GET /api/receipts/stats

Get comprehensive statistics.

```bash
curl http://localhost:3000/api/receipts/stats
```

## 🎯 How It Works

1. **Image Extraction** - Receipt images are extracted from iMessage or uploaded via web interface
2. **AI Processing** - **xAI Grok Vision** analyzes each image and extracts structured data
3. **Data Storage** - Receipt data is saved as JSON files
4. **API Access** - Next.js API routes provide access to receipt data
5. **Dashboard Display** - React components visualize spending patterns

## 📈 Receipt Data Format

Each receipt is processed into this structure:

```json
{
  "merchantName": "Starbucks",
  "merchantAddress": "123 Main St, Seattle, WA",
  "date": "2024-01-15",
  "time": "14:30",
  "items": [
    {
      "name": "Grande Latte",
      "quantity": 1,
      "price": 5.50,
      "total": 5.50
    }
  ],
  "subtotal": 5.50,
  "tax": 0.50,
  "tip": 2.00,
  "total": 8.00,
  "paymentMethod": "Credit Card",
  "lastFourDigits": "1234",
  "receiptNumber": "REC-001",
  "categoryTags": ["food", "coffee"]
}
```

## 🔒 Security

- ✅ API keys stored in `.env` (not committed to git)
- ✅ Comprehensive `.gitignore` for sensitive files
- ✅ Environment-based configuration
- ✅ Secure file upload handling

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Detailed setup instructions
- **[xAI/README.md](./xAI/README.md)** - Receipt processor documentation
- **[xAI/QUICKSTART.md](./xAI/QUICKSTART.md)** - Quick start guide
- **[xAI/INTEGRATION.md](./xAI/INTEGRATION.md)** - API integration guide
- **[xAI/PROJECT_SUMMARY.md](./xAI/PROJECT_SUMMARY.md)** - Architecture overview

## 🧪 Testing

Run the comprehensive test suite:

```bash
npm run receipt:test
```

This checks:
- ✅ Node.js version
- ✅ OpenAI API key validity
- ✅ API connectivity
- ✅ Directory structure
- ✅ Dependencies
- ✅ File permissions
- ✅ Existing receipt validation

## 🐛 Troubleshooting

### API Key Issues

```bash
# Check your .env file
cat .env | grep XAI_API_KEY

# Verify API key is set
echo $XAI_API_KEY
```

### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules
npm install
npm run xai:install
```

### No Images Found

```bash
# Check images directory
ls -la iMessage/saved-images/

# Run image extraction
npm run image-extract
```

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

## 💡 Tips

- **Test first** - Always run `npm run receipt:test` before processing
- **Start small** - Process one receipt before batch processing
- **Using xAI Grok** - Leverages X/Twitter's powerful Grok Vision model
- **Check logs** - Detailed error messages help debug issues
- **Use filters** - API supports filtering by merchant, category, date

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

[Your License Here]

## 🎓 Built With

- [Next.js 16](https://nextjs.org) - React framework
- [xAI Grok Vision](https://x.ai) - AI-powered OCR from X/Twitter
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [TypeScript](https://www.typescriptlang.org) - Type safety
- [Recharts](https://recharts.org) - Data visualization

## 🙏 Acknowledgments

- xAI / X (Twitter) for Grok Vision API
- Capital One for Nessie API
- shadcn for beautiful UI components

---

**Ready to start?** Follow the [SETUP.md](./SETUP.md) guide to get started! 🚀

