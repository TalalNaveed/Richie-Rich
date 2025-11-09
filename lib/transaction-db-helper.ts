/**
 * Helper function to save a Knot transaction to SQLite database
 * Converts Knot transaction format to our database format
 */
import { insertTransaction, type TransactionData, type TransactionItem } from '@/lib/database';
import { KnotTransaction } from '@/lib/knot-api';

export async function saveKnotTransactionToDB(
  knotTx: KnotTransaction,
  userId: number,
  accountId?: number
): Promise<number> {
  // Extract merchant name
  const merchantName = knotTx.merchant_name || knotTx.merchant?.name || 'Unknown Merchant';
  
  // Extract location (if available in transaction)
  const location = knotTx.merchant?.name || null;
  
  // Extract items from transaction
  const items: TransactionItem[] = [];
  
  if (knotTx.products || knotTx.items || knotTx.line_items) {
    const rawItems = knotTx.products || knotTx.items || knotTx.line_items || [];
    
    for (const item of rawItems) {
      // Extract price per unit
      const priceValue = 
        (item.price && (item.price.unit_price || item.price.unitPrice)) ||
        item.unit_price || 
        item.unitPrice || 
        (item.price && (item.price.total || item.price.sub_total)) ||
        item.price || 
        item.amount || 
        item.cost || 
        item.total_price || 
        item.totalPrice ||
        item.line_total ||
        item.lineTotal ||
        0;
      
      // Convert to number
      let pricePerUnit = 0;
      if (typeof priceValue === 'number') {
        pricePerUnit = priceValue;
      } else if (typeof priceValue === 'string') {
        const cleaned = priceValue.replace(/[^0-9.-]/g, '');
        pricePerUnit = parseFloat(cleaned) || 0;
      }
      
      // If pricePerUnit is 0 or not found, use 1 (for individual items)
      if (pricePerUnit === 0) {
        pricePerUnit = 1;
      }
      
      // Extract quantity
      const quantityValue = item.quantity || item.qty || item.quantity_ordered || 1;
      const quantity = typeof quantityValue === 'number' ? quantityValue : parseInt(String(quantityValue), 10) || 1;
      
      // For individual items, if quantity is 1 and we have a total price, use that as pricePerUnit
      if (quantity === 1 && pricePerUnit === 1) {
        const totalPrice = 
          (item.price && (item.price.total || item.price.sub_total)) ||
          item.total_price ||
          item.totalPrice ||
          item.line_total ||
          item.lineTotal ||
          item.price ||
          item.amount ||
          0;
        
        if (typeof totalPrice === 'number' && totalPrice > 0) {
          pricePerUnit = totalPrice;
        } else if (typeof totalPrice === 'string') {
          const cleaned = totalPrice.replace(/[^0-9.-]/g, '');
          const parsed = parseFloat(cleaned);
          if (parsed > 0) {
            pricePerUnit = parsed;
          }
        }
      }
      
      items.push({
        name: item.name || item.description || item.title || item.product_name || item.productName || 'Unknown Item',
        quantity,
        pricePerUnit,
        price: pricePerUnit * quantity
      });
    }
  }
  
  // If no items found, create a single item from the transaction total
  if (items.length === 0) {
    items.push({
      name: merchantName,
      quantity: 1,
      pricePerUnit: Math.abs(knotTx.amount || 0),
      price: Math.abs(knotTx.amount || 0)
    });
  }
  
  // Get transaction date
  const getDate = (tx: any): Date => {
    const dateStr = tx.datetime || tx.date || tx.created_at || tx.timestamp || tx.transaction_date || tx.purchase_date || tx.order_date;
    if (!dateStr) {
      return new Date();
    }
    
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    const timestamp = typeof dateStr === 'number' ? dateStr : parseInt(String(dateStr), 10);
    if (!isNaN(timestamp)) {
      const dateFromTs = timestamp < 946684800000 ? new Date(timestamp * 1000) : new Date(timestamp);
      if (!isNaN(dateFromTs.getTime())) {
        return dateFromTs;
      }
    }
    
    return new Date();
  };
  
  const transactionData: TransactionData = {
    userId,
    accountId,
    name: merchantName,
    location: location,
    items,
    datetime: getDate(knotTx)
  };
  
  return await insertTransaction(transactionData);
}

