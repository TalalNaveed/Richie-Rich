# Internet Search Fallback Strategy

## Current Implementation

The system now tries multiple methods to get real-time stock data:

### 1. **Models with Built-in Internet Search** (Best Option)
- `openai/gpt-4o-mini-search-preview` - Has built-in internet search capability
- No MCP servers needed - search is built into the model
- **Tries first** because it's the most reliable

### 2. **Brave Search MCP**
- `windsor/brave-search-mcp` - Privacy-focused web search
- Uses `openai/gpt-4o-mini` model
- **Tries second** if search model fails

### 3. **Exa MCP** (Semantic Search)
- `joerup/exa-mcp` - Semantic search engine
- Good for finding relevant content
- **Tries third** if Brave Search fails

### 4. **Both MCPs Together**
- Combines `windsor/brave-search-mcp` + `joerup/exa-mcp`
- Maximum search coverage
- **Tries fourth** if individual MCPs fail

### 5. **Model Knowledge Only** (Last Resort)
- Uses `openai/gpt-4o-mini` without MCP servers
- No real-time data - uses training data only
- **Only used if all search methods fail**

## Files Updated

1. **`mcp/dedalus_sonar_research.py`** - Stock research function
2. **`mcp/dedalus_stock_screener.py`** - Stock screening function

## Validation

The system now:
- ✅ Validates that `currentPrice` is a real number (not 0.0 or None)
- ✅ Extracts price from text if JSON parsing fails
- ✅ Only returns fallback data if NO real data is found
- ✅ Logs which method succeeded for debugging

## Testing

```bash
# Test research
python3 mcp/dedalus_sonar_research.py NVDA

# Check logs to see which method succeeded
# Look for: "✅ Success with..." messages
```

