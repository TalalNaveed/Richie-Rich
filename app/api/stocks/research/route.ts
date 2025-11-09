import { NextResponse } from 'next/server'
import { StockResearch } from '@/mcp/types'

/**
 * POST /api/stocks/research
 * Deep research on a specific stock using MCP Sonar
 * 
 * Body: { symbol: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { symbol } = body
    
    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json(
        { error: 'Symbol is required and must be a string' },
        { status: 400 }
      )
    }
    
    console.log(`🔍 [API] Research request for ${symbol.toUpperCase()}`)
    
    // Research using MCP Sonar
    // Since we're in an API route, we can use fetch to call external services
    // or use MCP tools if available
    
    const researchData = await researchStockWithSonar(symbol.toUpperCase())
    
    return NextResponse.json(researchData)
  } catch (error) {
    console.error('❌ [API] Error researching stock:', error)
    return NextResponse.json(
      {
        error: 'Failed to research stock',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Research stock using Dedalus Labs with Sonar MCP
 * Uses Python script that calls Dedalus SDK
 */
async function researchStockWithSonar(symbol: string): Promise<StockResearch> {
  console.log(`🔍 [Dedalus Sonar] Researching ${symbol}...`)
  
  // Check if Dedalus API key is configured
  const dedalusApiKey = process.env.DEDALUS_API_KEY
  
  if (!dedalusApiKey) {
    console.warn(`⚠️ [Dedalus Sonar] DEDALUS_API_KEY not configured, using fallback`)
    return generateFallbackResearch(symbol)
  }
  
  try {
    // Call Python script that uses Dedalus SDK
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    const path = await import('path')
    
    const scriptPath = path.join(process.cwd(), 'mcp', 'dedalus_sonar_research.py')
    
    console.log(`🐍 [Dedalus Sonar] Executing Python script for ${symbol}...`)
    
    // Set timeout to 35 seconds (script has 30s internal timeout)
    const { stdout, stderr } = await Promise.race([
      execAsync(
        `python3 "${scriptPath}" "${symbol}"`,
        {
          env: {
            ...process.env,
            DEDALUS_API_KEY: dedalusApiKey,
            PYTHONUNBUFFERED: '1',
          },
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large responses
        }
      ),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Script timeout')), 35000)
      )
    ]) as { stdout: string; stderr: string }
    
    if (stderr && !stderr.includes('Warning')) {
      console.warn(`⚠️ [Dedalus Sonar] Python stderr:`, stderr)
    }
    
    // Parse JSON response from Python script
    const researchData = JSON.parse(stdout.trim())
    
    if (researchData.error) {
      throw new Error(researchData.error)
    }
    
    console.log(`✅ [Dedalus Sonar] Research completed for ${symbol}`)
    return formatResearchData(symbol, researchData)
    
  } catch (error) {
    console.error(`❌ [Dedalus Sonar] Error researching ${symbol}:`, error)
    
    // If Python script fails, try fallback
    return generateFallbackResearch(symbol)
  }
}

/**
 * Format raw research data into StockResearch structure
 */
function formatResearchData(symbol: string, rawData: any): StockResearch {
  return {
    symbol: symbol.toUpperCase(),
    companyName: rawData.companyName || symbol,
    currentPrice: rawData.currentPrice,
    priceChange: rawData.priceChange,
    marketCap: rawData.marketCap,
    peRatio: rawData.peRatio,
    dividendYield: rawData.dividendYield,
    historicalPerformance: {
      oneYear: rawData.historicalPerformance?.oneYear || 0,
      threeYears: rawData.historicalPerformance?.threeYears || 0,
      fiveYears: rawData.historicalPerformance?.fiveYears || 0,
    },
    financialMetrics: {
      revenue: rawData.financialMetrics?.revenue,
      netIncome: rawData.financialMetrics?.netIncome,
      earningsPerShare: rawData.financialMetrics?.earningsPerShare,
      debtToEquity: rawData.financialMetrics?.debtToEquity,
    },
    analystRatings: {
      buy: rawData.analystRatings?.buy || 0,
      hold: rawData.analystRatings?.hold || 0,
      sell: rawData.analystRatings?.sell || 0,
      averageRating: rawData.analystRatings?.averageRating || 0,
    },
    recentNews: rawData.recentNews || [],
    riskFactors: rawData.riskFactors || [],
    opportunities: rawData.opportunities || [],
    recommendation: {
      action: rawData.recommendation?.action || 'hold',
      confidence: rawData.recommendation?.confidence || 50,
      reasoning: rawData.recommendation?.reasoning || 'Research completed',
      priceTarget: rawData.recommendation?.priceTarget,
      timeHorizon: rawData.recommendation?.timeHorizon || '12 months',
    },
    researchDate: new Date().toISOString(),
  }
}

/**
 * Generate fallback research when MCP Sonar is not available
 * This would integrate with free financial APIs or web scraping
 */
async function generateFallbackResearch(symbol: string): Promise<StockResearch> {
  console.log(`📊 [Sonar] Generating fallback research for ${symbol}`)
  
  // TODO: Integrate with free financial APIs like:
  // - Alpha Vantage (free tier available)
  // - Yahoo Finance API (unofficial)
  // - Financial Modeling Prep (free tier)
  // - Polygon.io (free tier)
  
  // For now, return a structured placeholder
  // In production, this would fetch real data
  
  return {
    symbol: symbol.toUpperCase(),
    companyName: symbol,
    recommendation: {
      action: 'hold',
      confidence: 50,
      reasoning: `Deep research for ${symbol} is being processed. Dedalus Labs integration is being configured. Please ensure DEDALUS_API_KEY is set in your environment variables and Python dependencies are installed (pip install -r mcp/requirements.txt).`,
      timeHorizon: '12 months',
    },
    historicalPerformance: {
      oneYear: 0,
      threeYears: 0,
      fiveYears: 0,
    },
    analystRatings: {
      buy: 0,
      hold: 0,
      sell: 0,
      averageRating: 0,
    },
    recentNews: [],
    riskFactors: ['Research data not yet available'],
    opportunities: [],
    researchDate: new Date().toISOString(),
  }
}

