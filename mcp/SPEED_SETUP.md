# Quick Setup - Using Sonar MCP Through Dedalus

## Setup (Super Simple!)

Add to your `.env`:
```bash
DEDALUS_API_KEY=your-dedalus-api-key-here
```

Install:
```bash
pip install dedalus-labs python-dotenv
```

That's it! No OpenAI or Google API keys needed - Dedalus routes to models for you.

## How It Works

- Dedalus uses your `DEDALUS_API_KEY` to access OpenAI models
- The script uses `openai/gpt-4o-mini` through Dedalus
- **Sonar MCP** (`dedalus/sonar-mcp`) provides internet access and deep research
- Fast, internet-enabled, and no separate API keys required!

## MCP Servers Used

- `dedalus/sonar-mcp` - Deep research and internet access

## Test It

```bash
python3 mcp/dedalus_sonar_research.py AAPL
```

## Speed

- **Dedalus + Sonar**: ~10-20 seconds
- Uses `gpt-4o-mini` which is fast and cost-effective
- Sonar MCP enables deep research and internet access capabilities

