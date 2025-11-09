import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { saveReceiptAsTransaction } from '@/lib/receipt-to-transaction';

// Track last processed receipt timestamp
const LAST_RECEIPT_FILE = path.resolve(process.cwd(), 'xAI/processed-receipts/.last-imessage-receipt.json');

/**
 * POST /api/imessage-receive - Receive JSON from Mac via wget/ngrok
 * This endpoint receives JSON files sent from a Mac and processes them
 */
export async function POST(request: NextRequest) {
  console.log('📥 [iMessage] POST /api/imessage-receive - JSON received from Mac');
  
  try {
    const body = await request.json();
    
    console.log('📥 [iMessage] Received JSON data:', {
      hasOrderName: !!body.orderName,
      hasItems: !!body.items,
      itemsCount: body.items?.length || 0,
      total: body.total
    });

    // Validate the JSON structure (should match ReceiptData format)
    if (!body.orderName || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
      console.error('❌ [iMessage] Invalid JSON structure:', {
        hasOrderName: !!body.orderName,
        hasItems: !!body.items,
        itemsIsArray: Array.isArray(body.items),
        itemsLength: body.items?.length || 0
      });
      return NextResponse.json(
        { 
          error: 'Invalid JSON structure. Expected: orderName, items (array), total',
          received: Object.keys(body)
        },
        { status: 400 }
      );
    }

    // Ensure total exists
    if (!body.total && body.items) {
      // Calculate total from items if not provided
      body.total = body.items.reduce((sum: number, item: any) => {
        return sum + (item.price || (item.ppu * item.quantity) || 0);
      }, 0);
    }

    // Ensure dateTime exists
    if (!body.dateTime) {
      body.dateTime = new Date().toISOString();
    }

    // Save JSON to processed-receipts directory
    const processedDir = path.resolve(process.cwd(), 'xAI/processed-receipts');
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
      console.log(`📂 [iMessage] Created processed receipts directory: ${processedDir}`);
    }
    
    // Create a unique hash from receipt data to detect duplicates
    const receiptHash = JSON.stringify({
      orderName: body.orderName,
      total: body.total,
      items: body.items.map((item: any) => ({
        name: item.name || item.itemName,
        price: item.price || (item.ppu * item.quantity),
        quantity: item.quantity || 1
      }))
    });
    
    // Check if this exact receipt was already processed
    const hashFile = path.join(processedDir, '.receipt-hashes.json');
    let processedHashes: string[] = [];
    if (fs.existsSync(hashFile)) {
      try {
        processedHashes = JSON.parse(fs.readFileSync(hashFile, 'utf-8'));
      } catch (error) {
        console.warn('⚠️  [iMessage] Could not read hash file, starting fresh');
      }
    }
    
    // Simple hash function
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(receiptHash).digest('hex');
    
    if (processedHashes.includes(hash)) {
      console.log(`⏭️  [iMessage] Duplicate receipt detected (hash: ${hash}), skipping...`);
      return NextResponse.json({
        success: false,
        duplicate: true,
        message: 'Receipt already processed',
        hash
      });
    }
    
    const timestamp = Date.now();
    const outputFilename = `imessage-${timestamp}.json`;
    const outputPath = path.join(processedDir, outputFilename);
    fs.writeFileSync(outputPath, JSON.stringify(body, null, 2));
    console.log(`💾 [iMessage] Saved JSON to: ${outputPath}`);
    
    // Save hash to prevent duplicates
    processedHashes.push(hash);
    fs.writeFileSync(hashFile, JSON.stringify(processedHashes, null, 2));

    // Save to database as transaction (always User 1 for demo)
    let transactionId: number | null = null;
    try {
      console.log(`💾 [iMessage] Saving to database as transaction for User 1...`);
      
      // Convert to ReceiptData format if needed
      const receiptData = {
        orderName: body.orderName,
        location: body.location || null,
        items: body.items.map((item: any) => ({
          name: item.name || item.itemName,
          quantity: item.quantity || 1,
          ppu: item.ppu || item.pricePerUnit || (item.price / (item.quantity || 1)),
          price: item.price || (item.ppu * item.quantity) || (item.pricePerUnit * item.quantity)
        })),
        prices: body.prices || body.items.map((item: any) => item.price || (item.ppu * item.quantity)),
        ppu: body.ppu || body.items.map((item: any) => item.ppu || item.pricePerUnit || (item.price / (item.quantity || 1))),
        quantities: body.quantities || body.items.map((item: any) => item.quantity || 1),
        dateTime: body.dateTime,
        subtotal: body.subtotal,
        tax: body.tax,
        tip: body.tip,
        total: body.total
      };

      transactionId = await saveReceiptAsTransaction(receiptData, 1);
      console.log(`✅ [iMessage] Transaction saved with ID: ${transactionId}`);
      
      // Save timestamp of last receipt
      fs.writeFileSync(LAST_RECEIPT_FILE, JSON.stringify({
        timestamp,
        transactionId,
        orderName: body.orderName,
        receivedAt: new Date().toISOString()
      }, null, 2));
    } catch (dbError) {
      console.error(`⚠️  [iMessage] Failed to save transaction to database:`, dbError);
      if (dbError instanceof Error) {
        console.error(`⚠️  [iMessage] Database error details:`, dbError.message);
      }
      // Continue even if database save fails - JSON is still saved to file system
    }

    console.log(`✅ [iMessage] JSON processing complete!`);
    return NextResponse.json({
      success: true,
      receipt: body,
      filename: outputFilename,
      transactionId: transactionId || null,
      message: 'JSON received and processed successfully'
    });
  } catch (error) {
    console.error('❌ [iMessage] Error processing JSON:', error);
    if (error instanceof Error) {
      console.error('❌ [iMessage] Error message:', error.message);
      console.error('❌ [iMessage] Error stack:', error.stack);
    }
    return NextResponse.json(
      { 
        error: 'Failed to process JSON',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/imessage-receive - Check for new receipts or health check
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const check = searchParams.get('check');
  
  if (check === 'true') {
    // Check for new receipts
    try {
      if (fs.existsSync(LAST_RECEIPT_FILE)) {
        const lastReceiptData = JSON.parse(fs.readFileSync(LAST_RECEIPT_FILE, 'utf-8'));
        const lastCheckFile = path.resolve(process.cwd(), 'xAI/processed-receipts/.last-check.json');
        let lastCheckTime = 0;
        
        if (fs.existsSync(lastCheckFile)) {
          const lastCheckData = JSON.parse(fs.readFileSync(lastCheckFile, 'utf-8'));
          lastCheckTime = lastCheckData.timestamp || 0;
        }
        
        // If last receipt is newer than last check, return it
        if (lastReceiptData.timestamp > lastCheckTime) {
          // Update last check time
          fs.writeFileSync(lastCheckFile, JSON.stringify({
            timestamp: lastReceiptData.timestamp,
            checkedAt: new Date().toISOString()
          }, null, 2));
          
          return NextResponse.json({
            hasNewReceipt: true,
            receipt: {
              orderName: lastReceiptData.orderName,
              timestamp: lastReceiptData.timestamp
            },
            transactionId: lastReceiptData.transactionId
          });
        }
      }
      
      return NextResponse.json({
        hasNewReceipt: false
      });
    } catch (error) {
      console.error('Error checking for new receipts:', error);
      return NextResponse.json({
        hasNewReceipt: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // Health check
  return NextResponse.json({
    status: 'ok',
    message: 'iMessage receiver endpoint is ready',
    timestamp: new Date().toISOString()
  });
}

