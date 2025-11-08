# 🚀 HackPrinceton Setup Guide

Complete setup instructions for the HackPrinceton receipt processing system.

## 📋 Prerequisites

- Node.js v18+ installed
- npm or yarn package manager
- **xAI API key** with Grok Vision access (from X/Twitter)
- (Optional) Capital One Nessie API key

## 🔧 Installation

### Quick Setup (Recommended)

```bash
# Clone or navigate to your project directory
cd HackPrinceton

# Run the automated setup
npm run setup

# Copy the environment template
cp .env.example .env

# Edit .env and add your API keys
nano .env  # or use your preferred editor
```

### Manual Setup

1. **Install main dependencies:**
```bash
npm install
```

2. **Install xAI module dependencies:**
```bash
cd xAI
npm install
cd ..
```

3. **Create environment file:**
```bash
cp .env.example .env
```

4. **Configure your API keys:**
Edit `.env` and add:
```bash
XAI_API_KEY=your-xai-api-key-here
```

## 🔑 Getting API Keys

### xAI Grok API Key (Required)

1. Go to [https://x.ai/api](https://x.ai/api) or [https://console.x.ai](https://console.x.ai)
2. Sign up or log in with your X (Twitter) account
3. Create a new API key
4. Copy the key
5. Paste it in your `.env` file as `XAI_API_KEY=your-key-here`

### Capital One Nessie API (Optional)

1. Go to [http://api.nessieisreal.com/](http://api.nessieisreal.com/)
2. Sign up for a developer account
3. Get your API key
4. Add to `.env`: `NESSIE_API_KEY=your-key-here`

## ✅ Verify Setup

Run the test suite to ensure everything is configured correctly:

```bash
# Test receipt processor
npm run receipt:test

# Or from xAI directory
cd xAI && npm run test
```

You should see:
```
✅ All critical tests passed! Ready to process receipts.
```

## 📁 Directory Structure

After setup, your structure should look like:

```
HackPrinceton/
├── .env                          # Your API keys (DO NOT COMMIT)
├── .env.example                  # Template for environment variables
├── .gitignore                    # Comprehensive gitignore
├── package.json                  # Main dependencies & scripts
├── app/                          # Next.js application
│   └── api/
│       └── receipts/            # Receipt API endpoints
├── iMessage/
│   ├── imageExtract.ts          # iMessage image extraction
│   └── saved-images/            # Extracted receipt images
├── xAI/
│   ├── receiptProcessor.ts      # Vision AI processor
│   ├── apiIntegration.ts        # Data utilities
│   ├── test.ts                  # Test suite
│   ├── package.json             # xAI dependencies
│   └── processed-receipts/      # Output JSON files
└── components/                   # React components
```

## 🎯 Quick Start

### 1. Extract Images from iMessage

```bash
# Edit iMessage/imageExtract.ts and add target phone number
npm run image-extract
```

### 2. Process Receipt Images

```bash
# From project root
npm run receipt:process

# Or from xAI directory
cd xAI && npm run process
```

### 3. View Statistics

```bash
npm run receipt:stats
```

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📊 Available Commands

### Root Level Commands

| Command | Description |
|---------|-------------|
| `npm run setup` | Full project setup |
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run image-extract` | Extract images from iMessage |
| `npm run receipt:setup` | Setup receipt processor |
| `npm run receipt:test` | Test receipt processor |
| `npm run receipt:process` | Process all receipts |
| `npm run receipt:stats` | View statistics |
| `npm run receipt:example` | Run examples |

### xAI Directory Commands

```bash
cd xAI

npm run setup          # Setup xAI module
npm run test           # Run tests
npm run process        # Process receipts
npm run stats          # View statistics
npm run example        # Run examples
```

## 🔒 Security Best Practices

### ✅ Do's

- ✅ Keep `.env` file in `.gitignore`
- ✅ Use `.env.example` as a template
- ✅ Never commit API keys
- ✅ Use environment-specific `.env` files
- ✅ Rotate API keys regularly

### ❌ Don'ts

- ❌ Don't commit `.env` to git
- ❌ Don't share API keys in chat/email
- ❌ Don't hardcode API keys in code
- ❌ Don't use production keys in development

## 🐛 Troubleshooting

### "Module not found" errors

```bash
# Reinstall dependencies
rm -rf node_modules
npm install
cd xAI && npm install && cd ..
```

### "xAI API error"

1. Check your API key in `.env`
2. Verify you have xAI Grok Vision access
3. Check your xAI account and credits at [https://console.x.ai](https://console.x.ai)
4. Ensure `.env` file is in project root
5. Verify API endpoint is correct: `https://api.x.ai/v1`

### "No images found"

1. Run `npm run image-extract` first
2. Check `iMessage/saved-images/` exists
3. Verify images are in supported formats (JPG, PNG, WEBP)

### Port already in use

```bash
# Change port in .env
PORT=3001

# Or kill existing process
lsof -ti:3000 | xargs kill -9
```

### Environment variables not loading

```bash
# Ensure .env is in project root
ls -la .env

# Verify file format (no spaces around =)
cat .env

# Restart development server
npm run dev
```

## 📈 Next Steps

1. ✅ Verify setup with `npm run receipt:test`
2. 📱 Configure iMessage extraction
3. 🖼️ Add receipt images to `saved-images/`
4. 🤖 Process receipts with `npm run receipt:process`
5. 🌐 Start the dev server with `npm run dev`
6. 📊 Build your dashboard components

## 🎓 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev)

## 💡 Tips

- **Use the test command** regularly to catch configuration issues early
- **Check the logs** if processing fails - they include detailed error messages
- **Start with one receipt** using `npm run receipt:example` before batch processing
- **Monitor API costs** on your OpenAI dashboard
- **Clear cache** if you update dependencies: `rm -rf node_modules .next`

## 📞 Support

If you encounter issues:

1. Check this SETUP.md file
2. Run `npm run receipt:test` for diagnostics
3. Review logs in console
4. Check [OpenAI Status](https://status.openai.com)
5. Review project documentation in `xAI/` folder

---

**Ready to go?** Run `npm run receipt:test` to verify everything works! ✨

