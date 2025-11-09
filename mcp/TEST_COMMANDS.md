# Test Commands for Deep Stock Research

## Option 1: Test Python Script Directly (Recommended)

This tests the core research function without FastAPI:

```bash
cd /home/thinking/hackPrinceton/HackPrinceton
python3 mcp/dedalus_sonar_research.py NVDA
```

Replace `NVDA` with any stock symbol (e.g., `AAPL`, `MSFT`, `TSLA`)

**Expected Output:** JSON with stock research data including currentPrice, financial metrics, etc.

---

## Option 2: Test FastAPI Endpoint (Full Stack)

This tests the complete flow including FastAPI:

### Make sure FastAPI is running first:
```bash
npm run api:server
```

### Then in another terminal, test with curl:
```bash
curl http://localhost:8000/api/research/NVDA
```

Or prettier JSON output:
```bash
curl http://localhost:8000/api/research/NVDA | python3 -m json.tool
```

### Test with different stocks:
```bash
# NVIDIA
curl http://localhost:8000/api/research/NVDA | python3 -m json.tool

# Apple
curl http://localhost:8000/api/research/AAPL | python3 -m json.tool

# Microsoft
curl http://localhost:8000/api/research/MSFT | python3 -m json.tool
```

---

## Option 3: Test from Browser

1. Make sure FastAPI is running: `npm run api:server`
2. Open browser: `http://localhost:8000/api/research/NVDA`
3. Should see JSON response

---

## Quick Test Script

Save this as `test_research.sh`:

```bash
#!/bin/bash
SYMBOL=${1:-NVDA}  # Default to NVDA if no argument
echo "Testing stock research for: $SYMBOL"
echo ""
curl -s http://localhost:8000/api/research/$SYMBOL | python3 -m json.tool | head -50
```

Make it executable and run:
```bash
chmod +x test_research.sh
./test_research.sh NVDA
./test_research.sh AAPL
```

---

## What to Look For:

✅ **Success indicators:**
- `currentPrice` is a number (not null or 0.0)
- `companyName` is the actual company name
- `financialMetrics` has real values
- `recentNews` array has items
- `recommendation.action` is "buy", "hold", or "sell"

❌ **Failure indicators:**
- `currentPrice: 0.0` or `null`
- `companyName: "Company name"` (placeholder)
- Empty arrays for `recentNews`, `riskFactors`, `opportunities`
- Error messages in the response

