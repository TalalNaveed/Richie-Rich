import { NextResponse } from 'next/server'
import { getTransactionById, getTransactionStats } from '@/lib/database'

/**
 * GET /api/transactions/db/[id] - Get a single transaction by ID
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid transaction ID' },
        { status: 400 }
      )
    }

    const transaction = await getTransactionById(id)

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error fetching transaction:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transaction', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}



