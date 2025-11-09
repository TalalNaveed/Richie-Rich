/**
 * Convert xAI receipt data to transaction format and save to database
 */
import { insertTransaction, getFirstUser, type TransactionData, type TransactionItem } from './database';
import { ReceiptData } from '../xAI/receiptProcessor';

/**
 * Convert xAI receipt data to transaction format and save to database
 * @param receiptData - The receipt data from xAI
 * @param userId - Optional user ID (if not provided, uses first user)
 * @returns The transaction ID
 */
export async function saveReceiptAsTransaction(
  receiptData: ReceiptData,
  userId?: number
): Promise<number> {
  console.log(`💾 [DB] Converting receipt to transaction format...`);
  
  // Get first user if not provided
  if (!userId) {
    userId = await getFirstUser();
  }

  // Convert receipt items to transaction items using the new format
  const items: TransactionItem[] = receiptData.items.map((item, index) => {
    // Use ppu from item or fallback to prices array
    const pricePerUnit = item.ppu || (receiptData.ppu && receiptData.ppu[index]) || item.price || 0;
    // Use price from item or fallback to prices array
    const totalPrice = item.price || (receiptData.prices && receiptData.prices[index]) || (pricePerUnit * item.quantity);
    
    return {
      name: item.name,
      quantity: item.quantity || (receiptData.quantities && receiptData.quantities[index]) || 1,
      pricePerUnit: pricePerUnit,
      price: totalPrice
    };
  });

  // If no items, create a single item from the total
  if (items.length === 0) {
    console.warn(`⚠️  [DB] No items found, creating single item from total`);
    items.push({
      name: receiptData.orderName || 'Unknown Merchant',
      quantity: 1,
      pricePerUnit: receiptData.total,
      price: receiptData.total
    });
  }

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
    itemsCount: items.length,
    total: receiptData.total,
    dateTime: transactionDate.toISOString()
  });
  
  // Prepare transaction data
  const transactionData: TransactionData = {
    userId,
    name: orderName,
    location: receiptData.location || null,
    items,
    datetime: transactionDate
  };

  // Save to database
  const transactionId = await insertTransaction(transactionData);
  
  console.log(`✅ [DB] Saved receipt as transaction ${transactionId} for user ${userId}, orderName: ${orderName}`);
  return transactionId;
}

