# FastAPI Stock Research Backend - Quick Start

## Setup

1. **Install FastAPI dependencies:**
   ```bash
   pip install -r mcp/api_requirements.txt
   ```

2. **Start the FastAPI server:**
   ```bash
   # From project root
   python3 mcp/api_server.py
   
   # Or with auto-reload
   uvicorn mcp.api_server:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **Start Next.js dev server:**
   ```bash
   pnpm dev
   ```

## Features

- ✅ **Caching**: Results cached for faster responses
  - Stock screening: 1 hour cache
  - Stock research: 30 minutes cache
- ✅ **FastAPI Backend**: Separate API server for Python scripts
- ✅ **CORS Enabled**: Frontend can call from localhost:3000
- ✅ **Cache Management**: Clear cache via API endpoints

## API Endpoints

- `GET /api/stocks-to-invest` - Get recommended stocks (cached 1h)
- `GET /api/research/{symbol}` - Get stock research (cached 30m)
- `DELETE /api/cache/{key}` - Clear specific cache
- `DELETE /api/cache` - Clear all cache

## Cache Location

Cache files stored in: `mcp/cache/*.json`

## Troubleshooting

- **Port 8000 already in use**: Change port in `api_server.py` or kill existing process
- **Import errors**: Make sure you're running from project root
- **CORS errors**: Check FastAPI CORS settings match your frontend URL

