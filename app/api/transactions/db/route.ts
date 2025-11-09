import { NextResponse } from 'next/server'
import { 
  insertTransaction, 
  getTransactions, 
  getTransactionById, 
  getTransactionStats,
  getOrCreateUser,
  createOrUpdateAccount,
  type TransactionData,
  type UserData,
  type AccountData
} from '@/lib/database'

/**
 * POST /api/transactions/db - Save a transaction to SQLite database
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.userId && !body.user) {
      return NextResponse.json(
        { error: 'Missing required field: userId or user (with email and name)' },
        { status: 400 }
      )
    }

    if (!body.name || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, items (array)' },
        { status: 400 }
      )
    }

    // Validate items structure
    for (const item of body.items) {
      if (!item.name || typeof item.quantity !== 'number' || typeof item.pricePerUnit !== 'number') {
        return NextResponse.json(
          { error: 'Each item must have: name, quantity (number), pricePerUnit (number)' },
          { status: 400 }
        )
      }
    }

    // Get or create user
    let userId: number;
    if (body.userId) {
      userId = body.userId;
    } else if (body.user) {
      const userData: UserData = {
        email: body.user.email,
        name: body.user.name
      };
      userId = await getOrCreateUser(userData);
    } else {
      return NextResponse.json(
        { error: 'Must provide userId or user object' },
        { status: 400 }
      );
    }

    // Handle account if provided
    let accountId: number | undefined;
    if (body.account) {
      const accountData: AccountData = {
        userId,
        accountNumber: body.account.accountNumber,
        accountHolderName: body.account.accountHolderName,
        accountBalance: body.account.accountBalance || 0,
        accountType: body.account.accountType,
        institution: body.account.institution || 'Capital One'
      };
      accountId = await createOrUpdateAccount(accountData);
    }

    // Prepare transaction data
    const transactionData: TransactionData = {
      userId,
      accountId,
      name: body.name,
      location: body.location || null,
      items: body.items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
        price: item.pricePerUnit * item.quantity // Calculate price
      })),
      datetime: body.datetime ? new Date(body.datetime) : new Date()
    }

    const transactionId = await insertTransaction(transactionData)

    return NextResponse.json({
      success: true,
      id: transactionId,
      userId,
      accountId,
      message: 'Transaction saved successfully'
    })
  } catch (error) {
    console.error('Error saving transaction:', error)
    return NextResponse.json(
      { error: 'Failed to save transaction', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/transactions/db - Get transactions from SQLite database
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    const userId = searchParams.get('userId') ? parseInt(searchParams.get('userId')!) : undefined
    const accountId = searchParams.get('accountId') ? parseInt(searchParams.get('accountId')!) : undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined
    const merchantName = searchParams.get('merchantName') || undefined

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const transactions = await getTransactions({
      userId,
      accountId,
      limit,
      offset,
      startDate,
      endDate,
      merchantName
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

