import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * GET /api/transactions/prisma - Get transactions from Prisma database
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    const userIdParam = searchParams.get('userId')
    const userId = userIdParam ? parseInt(userIdParam) : undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50

    // Build query - if no userId, show all transactions
    const where: any = {}
    if (userId) {
      where.userId = userId
    }
    // If no userId specified, show transactions from all users

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        items: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        datetime: 'desc',
      },
      take: limit,
    })

    // Transform Prisma format to component format
    const formattedTransactions = transactions.map(tx => {
      // Calculate total amount from items
      const totalAmount = tx.items.reduce((sum, item) => sum + item.totalPrice, 0)
      
      // Map items to the expected format
      const items = tx.items.map(item => ({
        name: item.itemName,
        quantity: item.quantity,
        price: item.totalPrice,
        pricePerUnit: item.pricePerUnit,
      }))

      return {
        id: tx.id,
        userId: tx.userId,
        userName: tx.user.name,
        name: tx.merchantName,
        location: tx.location,
        source: tx.source || 'manual', // Include source field
        items: items.map(item => item.name), // Array of item names
        quantities: items.map(item => item.quantity),
        prices: items.map(item => item.price),
        pricePerUnit: items.map(item => item.pricePerUnit),
        totalAmount,
        datetime: tx.datetime.toISOString(),
        createdAt: tx.datetime.toISOString(),
      }
    })

    return NextResponse.json(formattedTransactions)
  } catch (error) {
    console.error('Error fetching transactions from Prisma:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

