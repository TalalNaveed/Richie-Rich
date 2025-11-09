import { NextResponse } from 'next/server'

/**
 * GET /api/stocks/recommendations
 * Get top 10 stock recommendations using Dedalus MCP
 * Uses FastAPI backend with caching
 */
export async function GET(request: Request) {
  try {
    console.log('📊 [API] Fetching stock recommendations from FastAPI...')
    
    // Fetch from FastAPI backend (which uses Dedalus MCP)
    const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000'
    const response = await fetch(`${fastApiUrl}/api/stocks-to-invest`, {
      cache: 'no-store',
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `FastAPI error: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Transform FastAPI response to match StockRecommendation format
    const recommendations = (data.recommendedStocks || []).map((stock: any, index: number) => ({
      symbol: stock.symbol,
      companyName: stock.companyName,
      recommendation: 'buy' as const, // All recommended stocks are buy recommendations
      confidence: 75 + (10 - index) * 2, // Higher confidence for top stocks
      reasoning: stock.reason || `Strong market position and growth potential`,
      newsItems: [], // Will be populated by research
      riskLevel: 'medium' as const,
      priceTarget: undefined,
    }))
    
    console.log(`✅ [API] Fetched ${recommendations.length} recommendations from FastAPI`)
    
    return NextResponse.json({
      recommendations,
      cached: data.cached || false,
      generatedAt: data.dateGenerated || new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ [API] Error fetching recommendations:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
        recommendations: [],
      },
      { status: 500 }
    )
  }
}

