# Quick Start Guide - Stock Recommendations & Research

## Step 1: Install Python Dependencies

```bash
cd /home/thinking/hackPrinceton/HackPrinceton
pip install -r mcp/requirements.txt
```

Or install manually:
```bash
pip install dedalus-labs python-dotenv
```

## Step 2: Configure Environment Variables

Add these to your `.env` file:

```bash
# Dedalus Labs API Key (Required for deep research)
# Get it from: https://dedaluslabs.ai
DEDALUS_API_KEY=your-dedalus-api-key-here

# X API Bearer Token (Required for stock recommendations)
# Get it from: https://developer.twitter.com/en/portal/dashboard
X_API_BEARER_TOKEN=your-x-api-bearer-token-here
```

## Step 3: Test the Python Script

Test the Dedalus integration directly:

```bash
python3 mcp/dedalus_sonar_research.py AAPL
```

You should see JSON output with stock research data.

## Step 4: Start the Next.js Server

```bash
pnpm dev
# or
npm run dev
```

## Step 5: Use the Dashboard

1. Open http://localhost:3000
2. Scroll down to "Stock Recommendations" section
3. View recommendations based on recent news
4. Click "Deep Research" on any stock to get comprehensive analysis

## Troubleshooting

### Python script not found
- Make sure you're in the project root directory
- Check that `mcp/dedalus_sonar_research.py` exists

### Dedalus API key error
- Verify `DEDALUS_API_KEY` is set in `.env`
- Get your key from https://dedaluslabs.ai

### Python dependencies missing
```bash
pip install dedalus-labs python-dotenv
```

### No recommendations showing
- Check that `X_API_BEARER_TOKEN` is set
- Verify X API is working: `curl http://localhost:3000/api/x-api?type=stocks`

