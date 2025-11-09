# FastAPI Stock Research Backend Setup

## Installation

```bash
cd mcp
pip install -r api_requirements.txt
```

## Running the FastAPI Server

```bash
# From project root
python3 mcp/api_server.py

# Or using uvicorn directly
uvicorn mcp.api_server:app --host 0.0.0.0 --port 8000 --reload
```

The server will run on `http://localhost:8000`

## API Endpoints

### GET /api/stocks-to-invest
Get recommended stocks (cached for 1 hour)

### GET /api/research/{symbol}
Get deep research for a stock (cached for 30 minutes)

### DELETE /api/cache/{key}
Clear specific cache entry

### DELETE /api/cache
Clear all cache entries

## Caching

- Stock screening results: Cached for 1 hour
- Stock research results: Cached for 30 minutes
- Cache files stored in `mcp/cache/` directory

## Frontend Integration

The frontend components are configured to use `http://localhost:8000` for API calls.

Make sure FastAPI server is running before using the stock features!

