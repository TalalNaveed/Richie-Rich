import { NextResponse } from 'next/server'
import { getTransactionStats } from '@/lib/database'

/**
 * GET /api/transactions/db/stats - Get transaction statistics
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') ? parseInt(searchParams.get('userId')!) : undefined

    const stats = await getTransactionStats(userId)
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching transaction stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

