/**
 * Example usage of the receipt processor
 */

import processAllReceipts, { processSingleReceipt, ReceiptData } from './receiptProcessor.js';

// Example 1: Process all receipts
async function processAll() {
  console.log('=== Processing All Receipts ===\n');
  await processAllReceipts();
}

// Example 2: Process a single receipt
async function processSingle(filename: string) {
  console.log(`=== Processing Single Receipt: ${filename} ===\n`);
  const receiptData: ReceiptData | null = await processSingleReceipt(filename);
  
  if (receiptData) {
    console.log('\n📄 Receipt Details:');
    console.log(`   Merchant: ${receiptData.merchantName}`);
    console.log(`   Date: ${receiptData.date}`);
    console.log(`   Total: $${receiptData.total.toFixed(2)}`);
    console.log(`   Items: ${receiptData.items.length}`);
    
    if (receiptData.categoryTags && receiptData.categoryTags.length > 0) {
      console.log(`   Categories: ${receiptData.categoryTags.join(', ')}`);
    }
  } else {
    console.log('❌ Failed to process receipt');
  }
}

// Main execution
const command = process.argv[2];
const filename = process.argv[3];

if (command === 'single' && filename) {
  processSingle(filename)
    .then(() => console.log('\n✨ Done!'))
    .catch(err => console.error('Error:', err));
} else if (command === 'all' || !command) {
  processAll()
    .then(() => console.log('\n✨ Done!'))
    .catch(err => console.error('Error:', err));
} else {
  console.log('Usage:');
  console.log('  tsx example.ts                    # Process all receipts');
  console.log('  tsx example.ts all                # Process all receipts');
  console.log('  tsx example.ts single <filename>  # Process single receipt');
}



