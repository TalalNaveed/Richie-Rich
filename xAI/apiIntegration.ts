/**
 * API integration utilities for using receipt data in your Next.js app
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ReceiptData } from './receiptProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.resolve(__dirname, 'processed-receipts');

/**
 * Get all processed receipts
 */
export function getAllReceipts(): ReceiptData[] {
  try {
    const allReceiptsPath = path.join(OUTPUT_DIR, 'all-receipts.json');
    
    if (!fs.existsSync(allReceiptsPath)) {
      return [];
    }

    const data = fs.readFileSync(allReceiptsPath, 'utf-8');
    const results = JSON.parse(data) as Array<{ filename: string; data: ReceiptData | null }>;
    
    return results
      .filter(r => r.data !== null)
      .map(r => r.data!);
  } catch (error) {
    console.error('Error reading receipts:', error);
    return [];
  }
}

/**
 * Get a single receipt by filename
 */
export function getReceiptByFilename(filename: string): ReceiptData | null {
  try {
    const jsonFilename = `${path.parse(filename).name}.json`;
    const receiptPath = path.join(OUTPUT_DIR, jsonFilename);
    
    if (!fs.existsSync(receiptPath)) {
      return null;
    }

    const data = fs.readFileSync(receiptPath, 'utf-8');
    return JSON.parse(data) as ReceiptData;
  } catch (error) {
    console.error(`Error reading receipt ${filename}:`, error);
    return null;
  }
}

/**
 * Get receipts filtered by date range
 */
export function getReceiptsByDateRange(startDate: Date, endDate: Date): ReceiptData[] {
  const allReceipts = getAllReceipts();
  
  return allReceipts.filter(receipt => {
    const receiptDate = new Date(receipt.date);
    return receiptDate >= startDate && receiptDate <= endDate;
  });
}

/**
 * Get receipts filtered by merchant
 */
export function getReceiptsByMerchant(merchantName: string): ReceiptData[] {
  const allReceipts = getAllReceipts();
  
  return allReceipts.filter(receipt => 
    receipt.merchantName.toLowerCase().includes(merchantName.toLowerCase())
  );
}

/**
 * Get receipts filtered by category
 */
export function getReceiptsByCategory(category: string): ReceiptData[] {
  const allReceipts = getAllReceipts();
  
  return allReceipts.filter(receipt => 
    receipt.categoryTags?.some(tag => 
      tag.toLowerCase().includes(category.toLowerCase())
    )
  );
}

/**
 * Calculate total spending from receipts
 */
export function calculateTotalSpending(receipts: ReceiptData[]): number {
  return receipts.reduce((sum, receipt) => sum + receipt.total, 0);
}

/**
 * Get spending summary by category
 */
export function getSpendingSummaryByCategory(receipts: ReceiptData[]): Record<string, number> {
  const summary: Record<string, number> = {};
  
  receipts.forEach(receipt => {
    receipt.categoryTags?.forEach(category => {
      if (!summary[category]) {
        summary[category] = 0;
      }
      summary[category] += receipt.total;
    });
  });
  
  return summary;
}

/**
 * Get spending summary by merchant
 */
export function getSpendingSummaryByMerchant(receipts: ReceiptData[]): Record<string, number> {
  const summary: Record<string, number> = {};
  
  receipts.forEach(receipt => {
    const merchant = receipt.merchantName;
    if (!summary[merchant]) {
      summary[merchant] = 0;
    }
    summary[merchant] += receipt.total;
  });
  
  return summary;
}

/**
 * Get monthly spending summary
 */
export function getMonthlySpendingSummary(year?: number): Record<string, number> {
  const allReceipts = getAllReceipts();
  const summary: Record<string, number> = {};
  
  allReceipts.forEach(receipt => {
    const date = new Date(receipt.date);
    if (year && date.getFullYear() !== year) {
      return;
    }
    
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!summary[monthKey]) {
      summary[monthKey] = 0;
    }
    summary[monthKey] += receipt.total;
  });
  
  return summary;
}

/**
 * Export receipts as CSV
 */
export function exportToCSV(receipts: ReceiptData[], outputPath: string): void {
  const headers = [
    'Merchant',
    'Date',
    'Time',
    'Subtotal',
    'Tax',
    'Tip',
    'Total',
    'Payment Method',
    'Categories',
    'Items Count'
  ];
  
  const rows = receipts.map(receipt => [
    receipt.merchantName,
    receipt.date,
    receipt.time || '',
    receipt.subtotal.toFixed(2),
    receipt.tax.toFixed(2),
    receipt.tip?.toFixed(2) || '0.00',
    receipt.total.toFixed(2),
    receipt.paymentMethod || '',
    receipt.categoryTags?.join(';') || '',
    receipt.items.length.toString()
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  fs.writeFileSync(outputPath, csv);
  console.log(`📄 CSV exported to: ${outputPath}`);
}

/**
 * Get receipt statistics
 */
export interface ReceiptStats {
  totalReceipts: number;
  totalSpending: number;
  averageSpending: number;
  totalTax: number;
  totalTips: number;
  mostFrequentMerchant: string;
  topCategory: string;
  dateRange: { start: string; end: string };
}

export function getReceiptStats(receipts: ReceiptData[]): ReceiptStats | null {
  if (receipts.length === 0) {
    return null;
  }

  const totalSpending = calculateTotalSpending(receipts);
  const totalTax = receipts.reduce((sum, r) => sum + r.tax, 0);
  const totalTips = receipts.reduce((sum, r) => sum + (r.tip || 0), 0);
  
  const merchantCounts: Record<string, number> = {};
  receipts.forEach(r => {
    merchantCounts[r.merchantName] = (merchantCounts[r.merchantName] || 0) + 1;
  });
  const mostFrequentMerchant = Object.entries(merchantCounts)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  const categorySpending = getSpendingSummaryByCategory(receipts);
  const topCategory = Object.entries(categorySpending)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  
  const dates = receipts.map(r => new Date(r.date)).sort((a, b) => a.getTime() - b.getTime());
  
  return {
    totalReceipts: receipts.length,
    totalSpending,
    averageSpending: totalSpending / receipts.length,
    totalTax,
    totalTips,
    mostFrequentMerchant,
    topCategory,
    dateRange: {
      start: dates[0].toISOString().split('T')[0],
      end: dates[dates.length - 1].toISOString().split('T')[0]
    }
  };
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('📊 Receipt Statistics\n');
  
  const allReceipts = getAllReceipts();
  console.log(`Total receipts processed: ${allReceipts.length}\n`);
  
  if (allReceipts.length > 0) {
    const stats = getReceiptStats(allReceipts);
    if (stats) {
      console.log('Statistics:');
      console.log(`  Total Spending: $${stats.totalSpending.toFixed(2)}`);
      console.log(`  Average Spending: $${stats.averageSpending.toFixed(2)}`);
      console.log(`  Total Tax: $${stats.totalTax.toFixed(2)}`);
      console.log(`  Total Tips: $${stats.totalTips.toFixed(2)}`);
      console.log(`  Most Frequent Merchant: ${stats.mostFrequentMerchant}`);
      console.log(`  Top Category: ${stats.topCategory}`);
      console.log(`  Date Range: ${stats.dateRange.start} to ${stats.dateRange.end}`);
    }
    
    console.log('\n💰 Spending by Category:');
    const categorySpending = getSpendingSummaryByCategory(allReceipts);
    Object.entries(categorySpending)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, amount]) => {
        console.log(`  ${category}: $${amount.toFixed(2)}`);
      });
  }
}



