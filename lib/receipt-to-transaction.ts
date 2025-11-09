/**
 * Convert xAI receipt data to transaction format and save to database using Prisma
 * Includes robust duplicate detection and error handling
 */
import { PrismaClient } from '@prisma/client';
import { ReceiptData } from '../xAI/receiptProcessor';

const prisma = new PrismaClient();

/**
 * Check if a transaction already exists (duplicate detection)
 * Checks for transactions with same merchant, date (within 1 hour), and similar total (within $0.50)
 */
async function checkForDuplicate(
  userId: number,
  merchantName: string,
  transactionDate: Date,
  totalAmount: number
): Promise<number | null> {
  try {
    // Calculate time window: 1 hour before and after
    const timeWindow = 60 * 60 * 1000; // 1 hour in milliseconds
    const startTime = new Date(transactionDate.getTime() - timeWindow);
    const endTime = new Date(transactionDate.getTime() + timeWindow);
    
    // Tolerance for total amount comparison (within $0.50)
    const amountTolerance = 0.50;
    
    // Find potential duplicates
    // Note: SQLite doesn't support case-insensitive mode, so we'll compare in JavaScript
    const existingTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        datetime: {
          gte: startTime,
          lte: endTime,
        },
        source: 'receipt', // Only check receipt transactions for duplicates
      },
      include: {
        items: true,
      },
    });
    
    // Filter by case-insensitive merchant name match
    const matchingTransactions = existingTransactions.filter(tx => 
      tx.merchantName.toLowerCase() === merchantName.toLowerCase()
    );
    
    // Check if any existing transaction has a similar total amount
    for (const existingTx of matchingTransactions) {
      const existingTotal = existingTx.items.reduce((sum, item) => sum + item.totalPrice, 0);
      const amountDiff = Math.abs(existingTotal - totalAmount);
      
      if (amountDiff <= amountTolerance) {
        console.log(`🔍 [DB] Found duplicate transaction:`, {
          existingId: existingTx.id,
          merchant: merchantName,
          existingTotal: existingTotal.toFixed(2),
          newTotal: totalAmount.toFixed(2),
          amountDiff: amountDiff.toFixed(2),
          date: transactionDate.toISOString(),
        });
        return existingTx.id;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`⚠️  [DB] Error checking for duplicates:`, error);
    // Don't throw - allow transaction to proceed if duplicate check fails
    return null;
  }
}

/**
 * Convert xAI receipt data to transaction format and save to database using Prisma
 * @param receiptData - The receipt data from xAI
 * @param userId - Optional user ID (if not provided, defaults to User 1 for demo purposes)
 * @returns The transaction ID (or existing ID if duplicate)
 */
export async function saveReceiptAsTransaction(
  receiptData: ReceiptData,
  userId?: number
): Promise<number> {
  console.log(`💾 [DB] Converting receipt to transaction format...`);
  
  try {
    // Default to User 1 for all receipt uploads (demo requirement)
    if (!userId) {
      userId = 1;
      console.log(`👤 [DB] No userId provided, defaulting to User 1 for receipt upload`);
      
      // Verify User 1 exists
      const user1 = await prisma.user.findUnique({
        where: { id: 1 }
      });
      if (!user1) {
        throw new Error('User 1 not found in database. Please seed the database first.');
      }
    }
    
    console.log(`👤 [DB] Saving receipt transaction for User ${userId}`);

    // Convert receipt items to Prisma transaction items format
    const items = receiptData.items.map((item, index) => {
      // Use ppu from item or fallback to prices array
      const pricePerUnit = item.ppu || (receiptData.ppu && receiptData.ppu[index]) || item.price || 0;
      // Use price from item or fallback to prices array
      const totalPrice = item.price || (receiptData.prices && receiptData.prices[index]) || (pricePerUnit * item.quantity);
      
      return {
        itemName: item.name,
        quantity: item.quantity || (receiptData.quantities && receiptData.quantities[index]) || 1,
        pricePerUnit: pricePerUnit,
        totalPrice: totalPrice
      };
    });

    // If no items, create a single item from the total
    if (items.length === 0) {
      console.warn(`⚠️  [DB] No items found, creating single item from total`);
      items.push({
        itemName: receiptData.orderName || 'Unknown Merchant',
        quantity: 1,
        pricePerUnit: receiptData.total,
        totalPrice: receiptData.total
      });
    }

    // Calculate total amount from items
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

    // Parse dateTime from receipt (ISO format)
    let transactionDate: Date;
    if (receiptData.dateTime) {
      transactionDate = new Date(receiptData.dateTime);
      
      // If date parsing fails, use current date
      if (isNaN(transactionDate.getTime())) {
        console.warn(`⚠️  [DB] Invalid dateTime format: ${receiptData.dateTime}, using current date`);
        transactionDate = new Date();
      }
    } else {
      console.warn(`⚠️  [DB] No dateTime provided, using current date`);
      transactionDate = new Date();
    }

    // Ensure order name is not empty
    let orderName = receiptData.orderName?.trim();
    if (!orderName || orderName === '') {
      console.warn(`⚠️  [DB] Warning: orderName is missing in receipt data`);
      orderName = 'Unknown Merchant';
    }
    
    console.log(`💾 [DB] Transaction data prepared:`, {
      orderName,
      location: receiptData.location || 'N/A',
      dateTime: transactionDate.toISOString(),
      itemsCount: items.length,
      subtotal: receiptData.subtotal !== undefined ? `$${receiptData.subtotal.toFixed(2)}` : 'N/A',
      tax: receiptData.tax !== undefined ? `$${receiptData.tax.toFixed(2)}` : 'N/A',
      tip: receiptData.tip !== undefined ? `$${receiptData.tip.toFixed(2)}` : 'N/A',
      total: `$${totalAmount.toFixed(2)}`,
      source: 'receipt'
    });
    
    // Check for duplicates BEFORE saving
    const existingTransactionId = await checkForDuplicate(
      userId,
      orderName,
      transactionDate,
      totalAmount
    );
    
    if (existingTransactionId) {
      console.log(`⏭️  [DB] Skipping duplicate transaction. Existing ID: ${existingTransactionId}`);
      return existingTransactionId;
    }
    
    // Save to Prisma database with source marker
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        merchantName: orderName,
        location: receiptData.location || null,
        datetime: transactionDate,
        source: 'receipt', // Mark as coming from receipt upload
        items: {
          create: items,
        },
      },
    });
    
    console.log(`✅ [DB] Saved receipt as transaction ${transaction.id} for user ${userId}`);
    console.log(`   📍 Location: ${receiptData.location || 'Not provided'}`);
    console.log(`   📅 Date: ${transactionDate.toISOString()}`);
    console.log(`   💰 Total: $${totalAmount.toFixed(2)}`);
    console.log(`   📦 Items: ${items.length}`);
    return transaction.id;
  } catch (error) {
    console.error(`❌ [DB] Error saving receipt as transaction:`, error);
    if (error instanceof Error) {
      console.error(`❌ [DB] Error details:`, error.message);
      console.error(`❌ [DB] Error stack:`, error.stack);
    }
    // Re-throw to allow caller to handle
    throw error;
  }
}

