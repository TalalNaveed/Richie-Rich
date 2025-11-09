import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/monthly-savings - Calculate monthly savings for user1
 * Returns savings for the last month and historical monthly savings
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') ? parseInt(searchParams.get('userId')!) : 1;
    
    // Get User 2's transactions (comparison user) - all time
    const comparisonUserId = userId === 1 ? 2 : 1;
    
    const comparisonTransactions = await prisma.transaction.findMany({
      where: {
        userId: comparisonUserId,
        source: 'knot', // Only compare with Knot API data (User 2)
      },
      include: {
        items: true,
      },
    });

    // Build a map of item names to their prices from User 2
    const itemPriceMap = new Map<string, Array<{
      merchantName: string;
      location: string | null;
      pricePerUnit: number;
      totalPrice: number;
      quantity: number;
    }>>();

    comparisonTransactions.forEach(tx => {
      tx.items.forEach(item => {
        const itemName = item.itemName.toLowerCase().trim();
        if (!itemPriceMap.has(itemName)) {
          itemPriceMap.set(itemName, []);
        }
        itemPriceMap.get(itemName)!.push({
          merchantName: tx.merchantName,
          location: tx.location,
          pricePerUnit: item.pricePerUnit,
          totalPrice: item.totalPrice,
          quantity: item.quantity,
        });
      });
    });

    // Get User 1's transactions grouped by month
    const userTransactions = await prisma.transaction.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { datetime: 'asc' },
    });

    // Group transactions by month
    const monthlyTransactions = new Map<string, typeof userTransactions>();
    
    userTransactions.forEach(tx => {
      const monthKey = `${tx.datetime.getFullYear()}-${String(tx.datetime.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyTransactions.has(monthKey)) {
        monthlyTransactions.set(monthKey, []);
      }
      monthlyTransactions.get(monthKey)!.push(tx);
    });

    // Calculate savings for each month
    const monthlySavings: Array<{
      month: string;
      monthLabel: string;
      savings: number;
      transactionCount: number;
    }> = [];

    monthlyTransactions.forEach((transactions, monthKey) => {
      let totalSavings = 0;
      
      transactions.forEach(tx => {
        tx.items.forEach(item => {
          const itemName = item.itemName.toLowerCase().trim();
          const receiptPrice = item.pricePerUnit;
          const receiptQuantity = item.quantity;
          
          // Find best match from comparison user
          let bestSavings = 0;
          
          // Try exact match first
          if (itemPriceMap.has(itemName)) {
            const alternatives = itemPriceMap.get(itemName)!;
            for (const alt of alternatives) {
              const savingsPerUnit = receiptPrice - alt.pricePerUnit;
              if (savingsPerUnit > 0) {
                const potentialSavings = savingsPerUnit * receiptQuantity;
                if (potentialSavings > bestSavings) {
                  bestSavings = potentialSavings;
                }
              }
            }
          }
          
          // Try partial matching if no exact match
          if (bestSavings === 0) {
            for (const [key, alternatives] of itemPriceMap.entries()) {
              const keyWords = key.split(/\s+/);
              const itemWords = itemName.split(/\s+/);
              const hasMatch = keyWords.some(kw => itemWords.some(iw => iw.includes(kw) || kw.includes(iw))) ||
                              itemWords.some(iw => keyWords.some(kw => iw.includes(kw) || kw.includes(iw)));
              
              if (hasMatch && alternatives.length > 0) {
                for (const alt of alternatives) {
                  const savingsPerUnit = receiptPrice - alt.pricePerUnit;
                  if (savingsPerUnit > 0) {
                    const potentialSavings = savingsPerUnit * receiptQuantity;
                    if (potentialSavings > bestSavings) {
                      bestSavings = potentialSavings;
                    }
                  }
                }
              }
            }
          }
          
          totalSavings += bestSavings;
        });
      });
      
      // Format month label
      const [year, month] = monthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      monthlySavings.push({
        month: monthKey,
        monthLabel,
        savings: parseFloat(totalSavings.toFixed(2)),
        transactionCount: transactions.length,
      });
    });

    // Sort by month (most recent first)
    monthlySavings.sort((a, b) => b.month.localeCompare(a.month));

    // Get last month's savings
    const lastMonthSavings = monthlySavings.length > 0 ? monthlySavings[0] : null;
    const lastMonthTotal = lastMonthSavings ? lastMonthSavings.savings : 0;

    return NextResponse.json({
      success: true,
      lastMonthSavings: lastMonthTotal,
      lastMonthData: lastMonthSavings,
      monthlyHistory: monthlySavings,
      totalSavings: monthlySavings.reduce((sum, m) => sum + m.savings, 0),
    });
  } catch (error) {
    console.error('Error calculating monthly savings:', error);
    return NextResponse.json(
      { error: 'Failed to calculate monthly savings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

