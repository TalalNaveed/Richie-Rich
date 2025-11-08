import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const RECEIPTS_DIR = path.resolve(process.cwd(), 'xAI/processed-receipts');

interface ReceiptData {
  merchantName: string;
  date: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  tip?: number;
  total: number;
  categoryTags?: string[];
}

/**
 * GET /api/receipts/stats - Get receipt statistics
 */
export async function GET() {
  try {
    const allReceiptsPath = path.join(RECEIPTS_DIR, 'all-receipts.json');
    
    if (!fs.existsSync(allReceiptsPath)) {
      return NextResponse.json({
        totalReceipts: 0,
        totalSpending: 0,
        averageSpending: 0,
        totalTax: 0,
        totalTips: 0,
        byCategory: {},
        byMerchant: {},
        byMonth: {}
      });
    }

    const data = fs.readFileSync(allReceiptsPath, 'utf-8');
    const results = JSON.parse(data) as Array<{ filename: string; data: ReceiptData | null }>;
    
    const receipts = results
      .filter(r => r.data !== null)
      .map(r => r.data!);

    if (receipts.length === 0) {
      return NextResponse.json({
        totalReceipts: 0,
        totalSpending: 0,
        averageSpending: 0,
        totalTax: 0,
        totalTips: 0,
        byCategory: {},
        byMerchant: {},
        byMonth: {}
      });
    }

    // Calculate basic stats
    const totalSpending = receipts.reduce((sum, r) => sum + r.total, 0);
    const totalTax = receipts.reduce((sum, r) => sum + r.tax, 0);
    const totalTips = receipts.reduce((sum, r) => sum + (r.tip || 0), 0);

    // Spending by category
    const byCategory: Record<string, number> = {};
    receipts.forEach(receipt => {
      receipt.categoryTags?.forEach(category => {
        byCategory[category] = (byCategory[category] || 0) + receipt.total;
      });
    });

    // Spending by merchant
    const byMerchant: Record<string, { count: number; total: number }> = {};
    receipts.forEach(receipt => {
      const merchant = receipt.merchantName;
      if (!byMerchant[merchant]) {
        byMerchant[merchant] = { count: 0, total: 0 };
      }
      byMerchant[merchant].count++;
      byMerchant[merchant].total += receipt.total;
    });

    // Spending by month
    const byMonth: Record<string, number> = {};
    receipts.forEach(receipt => {
      const date = new Date(receipt.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      byMonth[monthKey] = (byMonth[monthKey] || 0) + receipt.total;
    });

    // Top merchants
    const topMerchants = Object.entries(byMerchant)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([name, data]) => ({ name, ...data }));

    // Recent receipts
    const recentReceipts = receipts
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(r => ({
        merchantName: r.merchantName,
        date: r.date,
        total: r.total,
        categoryTags: r.categoryTags
      }));

    return NextResponse.json({
      totalReceipts: receipts.length,
      totalSpending,
      averageSpending: totalSpending / receipts.length,
      totalTax,
      totalTips,
      byCategory,
      byMerchant,
      byMonth,
      topMerchants,
      recentReceipts
    });
  } catch (error) {
    console.error('Error calculating stats:', error);
    return NextResponse.json(
      { error: 'Failed to calculate statistics' },
      { status: 500 }
    );
  }
}





