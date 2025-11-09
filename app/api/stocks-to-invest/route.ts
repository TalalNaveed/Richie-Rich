import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

/**
 * GET /api/stocks-to-invest
 * Get list of recommended stocks to invest in
 */
export async function GET(request: Request) {
  try {
    console.log('📊 [API] Fetching recommended stocks...')
    
    // Check if Dedalus API key is configured
    const dedalusApiKey = process.env.DEDALUS_API_KEY
    
    if (!dedalusApiKey) {
      console.warn(`⚠️ [API] DEDALUS_API_KEY not configured`)
      return NextResponse.json(
        {
          dateGenerated: new Date().toISOString(),
          error: 'DEDALUS_API_KEY not configured',
          recommendedStocks: []
        },
        { status: 500 }
      )
    }
    
    try {
      // Call Python script that uses Dedalus SDK
      const scriptPath = path.join(process.cwd(), 'mcp', 'dedalus_stock_screener.py')
      
      console.log(`🐍 [API] Executing stock screener script...`)
      
      const { stdout, stderr } = await Promise.race([
        execAsync(
          `python3 "${scriptPath}"`,
          {
            env: {
              ...process.env,
              DEDALUS_API_KEY: dedalusApiKey,
              PYTHONUNBUFFERED: '1',
            },
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          }
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Script timeout')), 130000) // 130s timeout
        )
      ]) as { stdout: string; stderr: string }
      
      if (stderr && !stderr.includes('Warning') && !stderr.includes('DEBUG')) {
        console.warn(`⚠️ [API] Python stderr:`, stderr)
      }
      
      // Parse JSON response from Python script
      const screeningData = JSON.parse(stdout.trim())
      
      if (screeningData.error) {
        throw new Error(screeningData.error)
      }
      
      console.log(`✅ [API] Stock screening completed: ${screeningData.recommendedStocks?.length || 0} stocks`)
      
      return NextResponse.json(screeningData)
    } catch (error) {
      console.error(`❌ [API] Error screening stocks:`, error)
      return NextResponse.json(
        {
          dateGenerated: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
          recommendedStocks: []
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ [API] Error in stocks-to-invest endpoint:', error)
    return NextResponse.json(
      {
        dateGenerated: new Date().toISOString(),
        error: 'Failed to fetch recommended stocks',
        details: error instanceof Error ? error.message : 'Unknown error',
        recommendedStocks: []
      },
      { status: 500 }
    )
  }
}

