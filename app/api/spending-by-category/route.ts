import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/spending-by-category - Get spending breakdown by category for a user
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') ? parseInt(searchParams.get('userId')!) : 1;

    // Get all transactions for the user
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: { items: true },
    });

    // Categorize spending based on merchant names
    const categoryMap: Record<string, number> = {};
    
    // Common merchant to category mappings
    const merchantCategories: Record<string, string> = {
      'starbucks': 'Dining',
      'mcdonald': 'Dining',
      'subway': 'Dining',
      'pizza': 'Dining',
      'restaurant': 'Dining',
      'cafe': 'Dining',
      'coffee': 'Dining',
      'walmart': 'Groceries',
      'target': 'Groceries',
      'costco': 'Groceries',
      'kroger': 'Groceries',
      'safeway': 'Groceries',
      'whole foods': 'Groceries',
      'grocery': 'Groceries',
      'amazon': 'Shopping',
      'best buy': 'Shopping',
      'home depot': 'Shopping',
      'lowes': 'Shopping',
      'utilities': 'Utilities',
      'electric': 'Utilities',
      'gas': 'Utilities',
      'water': 'Utilities',
      'internet': 'Utilities',
      'phone': 'Utilities',
      'entertainment': 'Entertainment',
      'netflix': 'Entertainment',
      'spotify': 'Entertainment',
      'movie': 'Entertainment',
      'theater': 'Entertainment',
    };

    transactions.forEach(tx => {
      const merchantName = tx.merchantName.toLowerCase();
      let category = 'Other';
      
      // Find matching category
      for (const [keyword, cat] of Object.entries(merchantCategories)) {
        if (merchantName.includes(keyword)) {
          category = cat;
          break;
        }
      }
      
      // Calculate total for this transaction
      const total = tx.items.reduce((sum, item) => sum + item.totalPrice, 0);
      
      if (!categoryMap[category]) {
        categoryMap[category] = 0;
      }
      categoryMap[category] += total;
    });

    // Convert to array format and calculate percentages
    const totalSpending = Object.values(categoryMap).reduce((sum, val) => sum + val, 0);
    const categoryData = Object.entries(categoryMap)
      .map(([name, value]) => ({
        name,
        value: parseFloat(value.toFixed(2)),
        percentage: totalSpending > 0 ? parseFloat(((value / totalSpending) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.value - a.value); // Sort by value descending

    return NextResponse.json({
      success: true,
      categories: categoryData,
      totalSpending: parseFloat(totalSpending.toFixed(2)),
    });
  } catch (error) {
    console.error('Error fetching spending by category:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch spending by category',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

