# Exact Call Flow: "Learn More" Button → Dedalus MCP

## When User Clicks "Learn More" Button:

### 1. Frontend Component (React)
**File:** `components/stock-recommendations.tsx`
- Line 219: Button click sets `researchSymbol` state
- Line 233-236: Opens `StockResearchDialog` component

### 2. Research Dialog Component (React)
**File:** `components/stock-research-dialog.tsx`
- Line 45: `useEffect` triggers `fetchResearch()` when dialog opens
- Line 58: **HTTP GET Request:**
  ```
  http://localhost:8000/api/research/{SYMBOL}
  ```
  Example: `http://localhost:8000/api/research/NVDA`

### 3. FastAPI Backend Endpoint
**File:** `mcp/api_server.py`
- Line 178: `@app.get("/api/research/{symbol}")`
- Line 179: Function `research_stock(symbol: str)`
- Line 195: Calls Python function:
  ```python
  result = await research_stock_with_dedalus_sonar(symbol)
  ```

### 4. Python Research Function
**File:** `mcp/dedalus_sonar_research.py`
- Line 19: Function `research_stock_with_dedalus_sonar(symbol: str)`
- Line 33: Initializes Dedalus client:
  ```python
  client = AsyncDedalus()
  runner = DedalusRunner(client)
  ```
- Line 37-77: Creates research prompt (asks for stock price, metrics, news, etc.)
- Line 82-93: **Calls Dedalus SDK:**
  ```python
  result = await runner.run(
      input=research_prompt,
      model="openai/gpt-4o-mini",
      mcp_servers=["windsor/brave-search-mcp"],
      stream=False
  )
  ```

### 5. Dedalus SDK → MCP Server
- **Model:** `openai/gpt-4o-mini` (via Dedalus API)
- **MCP Server:** `windsor/brave-search-mcp`
- **What it does:** Uses Brave Search MCP to search the internet for real-time stock data

### 6. Response Flow (Backwards)
- Dedalus returns JSON with stock research data
- Python script parses JSON (line 138-157 in `dedalus_sonar_research.py`)
- FastAPI endpoint returns JSON response (line 217 in `api_server.py`)
- React component displays data in dialog (line 68-69 in `stock-research-dialog.tsx`)

## Key Files for Dedalus Team:

1. **`mcp/dedalus_sonar_research.py`** - Main Python function that calls Dedalus SDK
2. **`mcp/api_server.py`** - FastAPI endpoint that wraps the Python function
3. **Dedalus SDK Usage:**
   - `AsyncDedalus()` - Client initialization
   - `DedalusRunner(client)` - Runner initialization  
   - `runner.run(input=prompt, model="openai/gpt-4o-mini", mcp_servers=["windsor/brave-search-mcp"])`

## Environment Variables Needed:
- `DEDALUS_API_KEY` - Required for Dedalus SDK

## Current Issue:
- Sometimes `currentPrice` is not being parsed correctly from JSON response
- JSON might be wrapped in markdown code blocks (```json)


