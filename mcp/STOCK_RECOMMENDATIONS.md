# Stock Recommendations & MCP Sonar Integration

This document explains how to use the stock recommendation system and integrate with MCP Sonar for deep stock research.

## Overview

The stock recommendation system analyzes news from X (Twitter) API and generates buy/hold/sell recommendations based on sentiment analysis. Users can then request deep research on specific stocks using MCP Sonar from Dedalus.

## Features

1. **News-Based Stock Recommendations**
   - Analyzes stock news from X API
   - Extracts stock symbols from news text
   - Performs sentiment analysis
   - Generates buy/hold/sell recommendations with confidence scores

2. **Deep Stock Research (MCP Sonar)**
   - Comprehensive stock analysis
   - Historical performance (1, 3, 5 years)
   - Financial metrics and analyst ratings
   - Risk factors and opportunities
   - Investment recommendations

## API Endpoints

### GET /api/stocks/recommendations

Fetches stock recommendations based on current news.

**Response:**
```json
{
  "recommendations": [
    {
      "symbol": "AAPL",
      "companyName": "Apple Inc.",
      "recommendation": "buy",
      "confidence": 75,
      "reasoning": "Strong positive sentiment with 5 positive news items...",
      "newsItems": ["news_id_1", "news_id_2"],
      "riskLevel": "medium"
    }
  ],
  "newsCount": 20,
  "generatedAt": "2024-01-15T10:30:00Z"
}
```

### POST /api/stocks/research

Performs deep research on a specific stock using MCP Sonar.

**Request Body:**
```json
{
  "symbol": "AAPL"
}
```

**Response:**
```json
{
  "symbol": "AAPL",
  "companyName": "Apple Inc.",
  "currentPrice": 150.25,
  "priceChange": {
    "value": 2.50,
    "percent": 1.69
  },
  "historicalPerformance": {
    "oneYear": 15.5,
    "threeYears": 45.2,
    "fiveYears": 120.8
  },
  "financialMetrics": {
    "revenue": "$394.3B",
    "netIncome": "$99.8B",
    "earningsPerShare": 6.11,
    "debtToEquity": 1.73
  },
  "analystRatings": {
    "buy": 25,
    "hold": 8,
    "sell": 2,
    "averageRating": 4.2
  },
  "recommendation": {
    "action": "buy",
    "confidence": 85,
    "reasoning": "Strong fundamentals and positive analyst sentiment...",
    "priceTarget": 175.00,
    "timeHorizon": "12 months"
  },
  "riskFactors": ["Market volatility", "Supply chain concerns"],
  "opportunities": ["New product launches", "Expansion in emerging markets"],
  "researchDate": "2024-01-15T10:30:00Z"
}
```

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Dedalus Labs API Key (Required for deep research)
# Get your API key from https://dedaluslabs.ai
DEDALUS_API_KEY=your-dedalus-api-key-here

# X API Configuration (Required for recommendations)
X_API_BEARER_TOKEN=your-x-api-bearer-token-here
```

### Setting Up Dedalus Labs

1. **Get Dedalus API Key**
   - Create an account at [dedaluslabs.ai](https://dedaluslabs.ai)
   - Navigate to your dashboard
   - Generate a new API key in the settings section
   - Add it to your `.env` file as `DEDALUS_API_KEY`

2. **Install Python Dependencies**
   ```bash
   cd mcp
   pip install -r requirements.txt
   # Or install globally:
   pip install dedalus-labs python-dotenv
   ```

3. **Verify Python Installation**
   ```bash
   python3 --version  # Should be Python 3.8+
   python3 -c "import dedalus_labs; print('Dedalus SDK installed')"
   ```

4. **Test the Integration**
   - Start your Next.js development server
   - Navigate to the dashboard
   - Click "Deep Research" on any stock recommendation
   - Verify that research data is fetched via Dedalus

### MCP Servers Used

The system uses the following MCP servers via Dedalus:
- `windsor/brave-search-mcp` - For web search and current information
- `joerup/exa-mcp` - For semantic search and deep analysis

These are automatically available through Dedalus Labs marketplace.

## Usage

### In the Dashboard

1. **View Stock Recommendations**
   - Navigate to the "Stock Recommendations" section
   - Recommendations are automatically generated from recent news
   - Each recommendation shows:
     - Stock symbol and company name
     - Buy/Hold/Sell recommendation
     - Confidence percentage
     - Risk level
     - Reasoning based on news sentiment

2. **Request Deep Research**
   - Click the "Deep Research" button on any recommendation
   - A dialog will open showing comprehensive analysis
   - Research includes:
     - Current price and price changes
     - Historical performance metrics
     - Financial metrics (revenue, EPS, P/E ratio)
     - Analyst ratings
     - Risk factors and opportunities
     - Investment recommendation with price target

### Programmatic Usage

```typescript
// Fetch recommendations
const response = await fetch('/api/stocks/recommendations')
const { recommendations } = await response.json()

// Request deep research
const researchResponse = await fetch('/api/stocks/research', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ symbol: 'AAPL' })
})
const research = await researchResponse.json()
```

## How It Works

### Stock Recommendation Flow

1. **News Fetching**: Fetches stock news from X API (`/api/x-api?type=stocks`)
2. **Symbol Extraction**: Extracts stock symbols from news text using:
   - `$SYMBOL` pattern (e.g., `$AAPL`)
   - Uppercase symbol patterns (e.g., `AAPL`, `TSLA`)
   - Company name mappings (e.g., "Apple" → `AAPL`)
3. **Sentiment Analysis**: Analyzes sentiment using keyword-based approach
4. **Recommendation Generation**: Generates buy/hold/sell recommendations based on:
   - Aggregate sentiment scores
   - Positive vs negative news count
   - Confidence calculation

### Deep Research Flow

1. **User Request**: User clicks "Deep Research" button
2. **API Call**: Frontend calls `/api/stocks/research` with stock symbol
3. **MCP Sonar Integration**: 
   - Attempts to call MCP Sonar server if `MCP_SONAR_URL` is configured
   - Falls back to alternative methods if MCP Sonar is unavailable
4. **Data Processing**: Formats raw research data into structured format
5. **Display**: Shows comprehensive research in dialog component

## Troubleshooting

### Recommendations Not Showing

- Check that X API is configured (`X_API_BEARER_TOKEN`)
- Verify that stock news is being fetched (`/api/x-api?type=stocks`)
- Check browser console for errors

### Deep Research Not Working

- Verify `MCP_SONAR_URL` is set correctly in `.env`
- Ensure MCP Sonar server is running and accessible
- Check API route logs for errors
- The system will use fallback research if MCP Sonar is unavailable

### No Stock Symbols Found

- Stock symbols are extracted from news text
- Ensure news items contain stock symbols or company names
- Check that news filtering is working correctly

## Future Enhancements

- Integration with real-time stock price APIs
- More sophisticated sentiment analysis using NLP models
- Historical recommendation tracking
- Portfolio integration
- Alert system for significant news

