import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Compare items from a receipt with User 2's transactions to find cheaper alternatives
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, userId = 1 } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }

    // Get User 2's transactions (comparison user)
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
      transactionId: number;
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
          transactionId: tx.id,
        });
      });
    });

    // Compare each item from the receipt
    const savings = [];
    let totalPotentialSavings = 0;

    for (const receiptItem of items) {
      const itemName = (receiptItem.name || receiptItem.itemName || '').toLowerCase().trim();
      const receiptPrice = receiptItem.price || receiptItem.totalPrice || receiptItem.pricePerUnit || 0;
      const receiptQuantity = receiptItem.quantity || 1;

      // Find matching items (fuzzy matching)
      let bestMatch: typeof itemPriceMap extends Map<string, infer V> ? V[0] : never | null = null;
      let bestSavings = 0;

      // Try exact match first
      if (itemPriceMap.has(itemName)) {
        const alternatives = itemPriceMap.get(itemName)!;
        for (const alt of alternatives) {
          const altPricePerUnit = alt.pricePerUnit;
          const savingsPerUnit = receiptPrice / receiptQuantity - altPricePerUnit;
          if (savingsPerUnit > 0 && savingsPerUnit > bestSavings) {
            bestMatch = alt;
            bestSavings = savingsPerUnit * receiptQuantity;
          }
        }
      }

      // Try partial matching if no exact match
      if (!bestMatch) {
        for (const [key, alternatives] of itemPriceMap.entries()) {
          // Check if item name contains key words or vice versa
          const keyWords = key.split(/\s+/);
          const itemWords = itemName.split(/\s+/);
          const hasMatch = keyWords.some(kw => itemWords.some(iw => iw.includes(kw) || kw.includes(iw))) ||
                          itemWords.some(iw => keyWords.some(kw => iw.includes(kw) || kw.includes(iw)));

          if (hasMatch && alternatives.length > 0) {
            for (const alt of alternatives) {
              const altPricePerUnit = alt.pricePerUnit;
              const savingsPerUnit = receiptPrice / receiptQuantity - altPricePerUnit;
              if (savingsPerUnit > 0 && savingsPerUnit > bestSavings) {
                bestMatch = alt;
                bestSavings = savingsPerUnit * receiptQuantity;
              }
            }
          }
        }
      }

      if (bestMatch && bestSavings > 0) {
        savings.push({
          itemName: receiptItem.name || receiptItem.itemName,
          receiptPrice: receiptPrice,
          receiptQuantity: receiptQuantity,
          alternativeMerchant: bestMatch.merchantName,
          alternativeLocation: bestMatch.location,
          alternativePrice: bestMatch.pricePerUnit * receiptQuantity,
          savings: bestSavings,
          savingsPercentage: ((bestSavings / receiptPrice) * 100).toFixed(1),
        });
        totalPotentialSavings += bestSavings;
      }
    }

    // Calculate frequency-based savings (items bought multiple times)
    const frequencySavings = await calculateFrequencySavings(userId, comparisonUserId);

    return NextResponse.json({
      success: true,
      savings,
      totalPotentialSavings: totalPotentialSavings.toFixed(2),
      frequencySavings,
      message: savings.length > 0
        ? `You could save $${totalPotentialSavings.toFixed(2)} by shopping at different stores!`
        : 'No cheaper alternatives found for these items.',
    });
  } catch (error) {
    console.error('Error comparing prices:', error);
    return NextResponse.json(
      { error: 'Failed to compare prices', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate potential savings on frequently purchased items
 */
async function calculateFrequencySavings(userId: number, comparisonUserId: number) {
  // Get User 1's transactions
  const userTransactions = await prisma.transaction.findMany({
    where: { userId },
    include: { items: true },
  });

  // Count item frequencies
  const itemFrequency = new Map<string, { count: number; totalSpent: number; avgPrice: number }>();
  
  userTransactions.forEach(tx => {
    tx.items.forEach(item => {
      const itemName = item.itemName.toLowerCase().trim();
      if (!itemFrequency.has(itemName)) {
        itemFrequency.set(itemName, { count: 0, totalSpent: 0, avgPrice: 0 });
      }
      const freq = itemFrequency.get(itemName)!;
      freq.count += item.quantity;
      freq.totalSpent += item.totalPrice;
      freq.avgPrice = freq.totalSpent / freq.count;
    });
  });

  // Get comparison user's prices
  const comparisonTransactions = await prisma.transaction.findMany({
    where: { userId: comparisonUserId, source: 'knot' },
    include: { items: true },
  });

  const comparisonPrices = new Map<string, number>();
  comparisonTransactions.forEach(tx => {
    tx.items.forEach(item => {
      const itemName = item.itemName.toLowerCase().trim();
      if (!comparisonPrices.has(itemName) || comparisonPrices.get(itemName)! > item.pricePerUnit) {
        comparisonPrices.set(itemName, item.pricePerUnit);
      }
    });
  });

  // Calculate annual savings for frequently bought items
  const frequentItems = Array.from(itemFrequency.entries())
    .filter(([_, data]) => data.count >= 3) // Items bought 3+ times
    .map(([itemName, data]) => {
      const comparisonPrice = comparisonPrices.get(itemName);
      if (comparisonPrice && comparisonPrice < data.avgPrice) {
        const savingsPerUnit = data.avgPrice - comparisonPrice;
        const monthlySavings = savingsPerUnit * (data.count / 3); // Extrapolate to monthly
        const annualSavings = monthlySavings * 12;
        
        return {
          itemName: itemName,
          frequency: data.count,
          currentAvgPrice: data.avgPrice.toFixed(2),
          cheaperPrice: comparisonPrice.toFixed(2),
          monthlySavings: monthlySavings.toFixed(2),
          annualSavings: annualSavings.toFixed(2),
        };
      }
      return null;
    })
    .filter(item => item !== null);

  return frequentItems;
}

