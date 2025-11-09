# Complete Setup Guide - Stock Research with FastAPI & Caching

## ✅ What Was Implemented

1. **FastAPI Backend** (`mcp/api_server.py`)
   - Caching system for stock screening and research
   - RESTful API endpoints
   - CORS enabled for frontend integration

2. **Stock Screener** (`mcp/dedalus_stock_screener.py`)
   - Finds top 10 promising stocks
   - Uses Dedalus + Exa Search MCP
   - Returns structured JSON

3. **Stock Research** (`mcp/dedalus_sonar_research.py`)
   - Deep research on individual stocks
   - Uses Dedalus + Exa Search MCP
   - Comprehensive analysis

4. **Frontend Components**
   - `components/stocks-to-invest.tsx` - Displays recommended stocks
   - `components/stock-research-dialog.tsx` - Shows detailed research
   - Both integrated into dashboard

5. **Footer Preserved**
   - Footer component with carousel kept intact
   - No modifications to footer.tsx

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Python dependencies for FastAPI
pip install -r mcp/api_requirements.txt

# Python dependencies for stock research
pip install -r mcp/requirements.txt
```

Or use npm scripts:
```bash
npm run api:install
pip install -r mcp/requirements.txt
```

### 2. Start FastAPI Server

```bash
npm run api:server

# Or directly:
python3 mcp/api_server.py
```

Server runs on `http://localhost:8000`

### 3. Start Next.js Dev Server

```bash
pnpm dev
```

### 4. Use the Dashboard

- Navigate to `http://localhost:3000`
- Scroll to "Stocks to Invest" section
- View recommended stocks
- Click "Deep Research" for detailed analysis

## 📊 Caching

- **Stock Screening**: Cached for 1 hour
- **Stock Research**: Cached for 30 minutes
- Cache files: `mcp/cache/*.json`
- Clear cache: `DELETE /api/cache` or `DELETE /api/cache/{key}`

## 🔧 API Endpoints

- `GET /api/stocks-to-invest` - Get recommended stocks
- `GET /api/research/{symbol}` - Get stock research
- `DELETE /api/cache` - Clear all cache
- `DELETE /api/cache/{key}` - Clear specific cache

## 📝 Notes

- Footer component preserved - no changes made
- All merge conflicts resolved
- FastAPI runs separately from Next.js
- Frontend calls FastAPI on port 8000

