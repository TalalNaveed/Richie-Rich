import { NextResponse } from 'next/server'
import { getUserAccounts, createOrUpdateAccount, getOrCreateUser, type AccountData, type UserData } from '@/lib/database'

/**
 * POST /api/accounts/db - Create or update an account
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

    if (!body.accountHolderName || typeof body.accountBalance !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: accountHolderName, accountBalance' },
        { status: 400 }
      )
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

    // Create or update account
    const accountData: AccountData = {
      userId,
      accountNumber: body.accountNumber,
      accountHolderName: body.accountHolderName,
      accountBalance: body.accountBalance,
      accountType: body.accountType,
      institution: body.institution || 'Capital One'
    };

    const accountId = await createOrUpdateAccount(accountData);

    return NextResponse.json({
      success: true,
      id: accountId,
      userId,
      message: 'Account saved successfully'
    })
  } catch (error) {
    console.error('Error saving account:', error)
    return NextResponse.json(
      { error: 'Failed to save account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/accounts/db - Get user accounts
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') ? parseInt(searchParams.get('userId')!) : undefined

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const accounts = await getUserAccounts(userId)
    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}



