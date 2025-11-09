"""
FastAPI Backend for Stock Research with Caching
Provides endpoints for stock screening and research with result caching
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import json
import os
from datetime import datetime, timedelta
from pathlib import Path
import sys

# Add parent directory to path to import our modules
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Import modules
try:
    from mcp.dedalus_stock_screener import screen_stocks_with_dedalus
    from mcp.dedalus_sonar_research import research_stock_with_dedalus_sonar
except ImportError:
    # Fallback if running from mcp directory
    import dedalus_stock_screener
    import dedalus_sonar_research
    screen_stocks_with_dedalus = dedalus_stock_screener.screen_stocks_with_dedalus
    research_stock_with_dedalus_sonar = dedalus_sonar_research.research_stock_with_dedalus_sonar

app = FastAPI(title="Stock Research API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache directory
CACHE_DIR = Path(__file__).parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)

# Cache TTL (Time To Live) in seconds
STOCK_SCREEN_CACHE_TTL = 3600  # 1 hour
STOCK_RESEARCH_CACHE_TTL = 1800  # 30 minutes


class RecommendedStock(BaseModel):
    symbol: str
    companyName: str
    reason: str


class StockScreeningResponse(BaseModel):
    dateGenerated: str
    recommendedStocks: List[RecommendedStock]
    cached: bool = False


class StockResearchResponse(BaseModel):
    symbol: str
    companyName: str
    currentPrice: Optional[float] = None
    priceChange: Optional[Dict[str, float]] = None
    historicalPerformance: Dict[str, float]
    financialMetrics: Optional[Dict[str, Any]] = None
    analystRatings: Dict[str, Any]
    recentNews: List[Dict[str, Any]]
    riskFactors: List[str]
    opportunities: List[str]
    recommendation: Dict[str, Any]
    researchDate: str
    cached: bool = False


def get_cache_path(key: str) -> Path:
    """Get cache file path for a key"""
    return CACHE_DIR / f"{key}.json"


def load_cache(key: str, ttl: int) -> Optional[Dict[str, Any]]:
    """Load cached data if it exists and is not expired"""
    cache_path = get_cache_path(key)
    
    if not cache_path.exists():
        return None
    
    try:
        with open(cache_path, 'r') as f:
            cached_data = json.load(f)
        
        # Check if cache is expired
        cache_time = datetime.fromisoformat(cached_data.get('cached_at', ''))
        if datetime.now() - cache_time > timedelta(seconds=ttl):
            cache_path.unlink()  # Delete expired cache
            return None
        
        return cached_data.get('data')
    except Exception as e:
        print(f"Error loading cache: {e}")
        return None


def save_cache(key: str, data: Dict[str, Any]):
    """Save data to cache"""
    cache_path = get_cache_path(key)
    
    try:
        cache_data = {
            'data': data,
            'cached_at': datetime.now().isoformat()
        }
        with open(cache_path, 'w') as f:
            json.dump(cache_data, f, indent=2)
    except Exception as e:
        print(f"Error saving cache: {e}")


@app.get("/")
async def root():
    return {"message": "Stock Research API", "version": "1.0.0"}


@app.get("/api/stocks-to-invest", response_model=StockScreeningResponse)
async def get_stocks_to_invest():
    """
    Get list of recommended stocks to invest in
    Results are cached for 1 hour
    """
    cache_key = "stocks_to_invest"
    
    # Try to load from cache
    cached_result = load_cache(cache_key, STOCK_SCREEN_CACHE_TTL)
    if cached_result:
        cached_result['cached'] = True
        return StockScreeningResponse(**cached_result)
    
    try:
        # Run stock screening
        result = await screen_stocks_with_dedalus()
        
        # Check if there's an error in the result
        if 'error' in result:
            print(f"⚠️ [API] Stock screening returned error: {result['error']}", file=sys.stderr)
            # If we have fallback stocks, use them
            if result.get('recommendedStocks') and len(result['recommendedStocks']) > 0:
                print(f"✅ [API] Using fallback stocks: {len(result['recommendedStocks'])} stocks", file=sys.stderr)
            else:
                # Return error response
                raise HTTPException(status_code=500, detail=result['error'])
        
        # Ensure dateGenerated exists
        if 'dateGenerated' not in result:
            result['dateGenerated'] = datetime.now().isoformat()
        
        result['cached'] = False
        
        # Save to cache (even if it's fallback data)
        save_cache(cache_key, result)
        
        return StockScreeningResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [API] Exception during stock screening: {str(e)}", file=sys.stderr)
        # Try to return fallback data
        from mcp.dedalus_stock_screener import create_fallback_screening
        fallback = create_fallback_screening()
        fallback['cached'] = False
        return StockScreeningResponse(**fallback)


@app.get("/api/research/{symbol}", response_model=StockResearchResponse)
async def research_stock(symbol: str):
    """
    Get deep research for a specific stock
    Results are cached for 30 minutes
    """
    symbol = symbol.upper()
    cache_key = f"research_{symbol}"
    
    # Try to load from cache
    cached_result = load_cache(cache_key, STOCK_RESEARCH_CACHE_TTL)
    if cached_result:
        cached_result['cached'] = True
        return StockResearchResponse(**cached_result)
    
    try:
        # Run stock research
        result = await research_stock_with_dedalus_sonar(symbol)
        
        # Ensure researchDate exists
        if 'researchDate' not in result:
            result['researchDate'] = datetime.now().isoformat()
        
        # Validate and ensure currentPrice is preserved
        if 'currentPrice' in result and result['currentPrice'] is not None:
            # Ensure it's a float
            try:
                result['currentPrice'] = float(result['currentPrice'])
            except (ValueError, TypeError):
                print(f"⚠️ [API] Invalid currentPrice value: {result.get('currentPrice')}", file=sys.stderr)
        
        # Debug log currentPrice
        print(f"DEBUG: [API] Returning currentPrice: {result.get('currentPrice')}", file=sys.stderr)
        
        result['cached'] = False
        
        # Save to cache
        save_cache(cache_key, result)
        
        return StockResearchResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error researching stock: {str(e)}")


@app.delete("/api/cache/{key}")
async def clear_cache(key: str):
    """Clear a specific cache entry"""
    cache_path = get_cache_path(key)
    if cache_path.exists():
        cache_path.unlink()
        return {"message": f"Cache cleared for {key}"}
    return {"message": f"No cache found for {key}"}


@app.delete("/api/cache")
async def clear_all_cache():
    """Clear all cache entries"""
    cleared = 0
    for cache_file in CACHE_DIR.glob("*.json"):
        cache_file.unlink()
        cleared += 1
    return {"message": f"Cleared {cleared} cache entries"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

