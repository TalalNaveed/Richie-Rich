# Dedalus Sonar Stock Research Setup

This directory contains the Dedalus Labs integration for deep stock research.

## Setup

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment:**
   Add to your `.env` file:
   ```bash
   DEDALUS_API_KEY=your-dedalus-api-key-here
   ```

3. **Test the Python script:**
   ```bash
   python3 dedalus_sonar_research.py AAPL
   ```

## How It Works

1. The TypeScript API route (`app/api/stocks/research/route.ts`) receives a research request
2. It calls the Python script (`dedalus_sonar_research.py`) with the stock symbol
3. The Python script uses Dedalus Labs SDK with MCP servers to perform research
4. Results are returned as JSON and displayed in the UI

## MCP Servers

The script uses these MCP servers via Dedalus:
- `windsor/brave-search-mcp` - Web search
- `joerup/exa-mcp` - Semantic search

To add Sonar MCP when available, update the `mcp_servers` list in `dedalus_sonar_research.py`.
