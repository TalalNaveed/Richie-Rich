import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/investment-earnings - Calculate potential earnings from savings
 * Uses simple compound interest calculation: 10% annual return
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') ? parseInt(searchParams.get('userId')!) : 1;
    
    // Get monthly savings data directly from database
    const comparisonUserId = userId === 1 ? 2 : 1;
    
    const comparisonTransactions = await prisma.transaction.findMany({
      where: {
        userId: comparisonUserId,
        source: 'knot',
      },
      include: {
        items: true,
      },
    });

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

    const userTransactions = await prisma.transaction.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { datetime: 'asc' },
    });

    const monthlyTransactions = new Map<string, typeof userTransactions>();
    
    userTransactions.forEach(tx => {
      const monthKey = `${tx.datetime.getFullYear()}-${String(tx.datetime.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyTransactions.has(monthKey)) {
        monthlyTransactions.set(monthKey, []);
      }
      monthlyTransactions.get(monthKey)!.push(tx);
    });

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
          
          let bestSavings = 0;
          
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

    monthlySavings.sort((a, b) => b.month.localeCompare(a.month));
    
    if (monthlySavings.length === 0) {
      return NextResponse.json({
        success: true,
        totalEarnings: 0,
        totalReturnPercent: 0,
        finalValue: 0,
        initialInvestment: 0,
        stockResults: [],
        monthlyBreakdown: [],
        message: 'No savings data available',
      });
    }
    
    // Simple compound interest calculation: 10% annual = ~0.797% monthly
    const annualRate = 0.10; // 10% per year
    const monthlyRate = Math.pow(1 + annualRate, 1/12) - 1; // Compound monthly
    
    const totalInitialInvestment = monthlySavings.reduce((sum, m) => sum + m.savings, 0);
    
    // Calculate compound interest for each month's savings
    // Each month's savings compounds from when it was saved until now
    const now = new Date();
    const monthlyBreakdown = monthlySavings.map((monthData, index) => {
      const monthDate = new Date(parseInt(monthData.month.split('-')[0]), parseInt(monthData.month.split('-')[1]) - 1);
      const monthsInvested = Math.max(0, (now.getFullYear() - monthDate.getFullYear()) * 12 + 
                                      (now.getMonth() - monthDate.getMonth()));
      
      // Compound interest: A = P(1 + r)^n
      const futureValue = monthData.savings * Math.pow(1 + monthlyRate, monthsInvested);
      const earnings = futureValue - monthData.savings;
      
      return {
        month: monthData.month,
        monthLabel: monthData.monthLabel,
        savings: monthData.savings,
        potential_value: parseFloat(futureValue.toFixed(2)),
        potential_earnings: parseFloat(earnings.toFixed(2)),
        monthsInvested: monthsInvested,
      };
    });
    
    // Calculate total final value and earnings
    const totalFinalValue = monthlyBreakdown.reduce((sum, m) => sum + m.potential_value, 0);
    const totalEarnings = totalFinalValue - totalInitialInvestment;
    const totalReturnPercent = totalInitialInvestment > 0 
      ? (totalEarnings / totalInitialInvestment) * 100 
      : 0;
    
    return NextResponse.json({
      success: true,
      totalEarnings: parseFloat(totalEarnings.toFixed(2)),
      totalReturnPercent: parseFloat(totalReturnPercent.toFixed(2)),
      finalValue: parseFloat(totalFinalValue.toFixed(2)),
      initialInvestment: parseFloat(totalInitialInvestment.toFixed(2)),
      annualRate: annualRate * 100, // Return as percentage
      monthlyRate: parseFloat((monthlyRate * 100).toFixed(4)), // Return as percentage
      stockResults: [
        {
          symbol: 'Portfolio',
          weight: 1.0,
          final_value: parseFloat(totalFinalValue.toFixed(2)),
          return_percent: parseFloat(totalReturnPercent.toFixed(2)),
        },
      ],
      monthlyBreakdown: monthlyBreakdown,
    });
  } catch (error) {
    console.error('Error calculating investment earnings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to calculate investment earnings', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
