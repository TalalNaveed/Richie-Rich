import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';

// Note: In production, you'd want to import these properly
// For now, we'll read the JSON files directly
const RECEIPTS_DIR = path.resolve(process.cwd(), 'xAI/processed-receipts');

export interface ReceiptData {
  orderName: string;
  location?: string;
  items: Array<{
    name: string;
    quantity: number;
    ppu: number;
    price: number;
  }>;
  prices: number[];
  ppu: number[];
  quantities: number[];
  dateTime: string;
  subtotal?: number;
  tax?: number;
  tip?: number;
  total: number;
}

/**
 * GET /api/receipts - Get all receipts or filter by query params
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const merchant = searchParams.get('merchant');
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Read all receipts
    const allReceiptsPath = path.join(RECEIPTS_DIR, 'all-receipts.json');
    
    if (!fs.existsSync(allReceiptsPath)) {
      return NextResponse.json({ receipts: [], message: 'No receipts found' });
    }

    const data = fs.readFileSync(allReceiptsPath, 'utf-8');
    const results = JSON.parse(data) as Array<{ filename: string; data: ReceiptData | null }>;
    
    let receipts = results
      .filter(r => r.data !== null)
      .map(r => r.data!);

    // Apply filters
    if (merchant) {
      receipts = receipts.filter(r => 
        r.orderName.toLowerCase().includes(merchant.toLowerCase())
      );
    }

    if (category) {
      // Category filtering removed as categoryTags no longer exists in new format
      // Can be re-added if needed
    }

    if (startDate) {
      const start = new Date(startDate);
      receipts = receipts.filter(r => new Date(r.dateTime) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      receipts = receipts.filter(r => new Date(r.dateTime) <= end);
    }

    // Calculate summary stats
    const stats = {
      total: receipts.length,
      totalSpending: receipts.reduce((sum, r) => sum + r.total, 0),
      totalTax: receipts.reduce((sum, r) => sum + r.tax, 0),
      totalTips: receipts.reduce((sum, r) => sum + (r.tip || 0), 0),
    };

    return NextResponse.json({ receipts, stats });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/receipts - Process a new receipt image with xAI
 */
export async function POST(request: NextRequest) {
  console.log('📤 [API] POST /api/receipts - Receipt upload request received');
  
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      console.error('❌ [API] No image file provided in request');
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    console.log(`📁 [API] Received file: ${file.name} (${(file.size / 1024).toFixed(2)} KB, type: ${file.type})`);

    // Save the uploaded image to the saved-images directory
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const imagesDir = path.resolve(process.cwd(), 'iMessage/saved-images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
      console.log(`📂 [API] Created images directory: ${imagesDir}`);
    }

    const filename = `upload-${Date.now()}-${file.name}`;
    const filepath = path.join(imagesDir, filename);
    await writeFile(filepath, buffer);
    console.log(`💾 [API] Saved image to: ${filepath}`);

    // Import validation and processing functions
    console.log(`📦 [API] Importing validation and processing modules...`);
    const { validateReceiptImage } = await import('@/iMessage/imageValidator');
    const { processReceiptImage } = await import('@/xAI/receiptProcessor');
    console.log(`✅ [API] Modules imported successfully`);

    // Validate the image first
    console.log(`🔍 [API] Starting image validation for: ${filename}`);
    const validation = await validateReceiptImage(filepath);
    console.log(`🔍 [API] Validation result:`, {
      isValid: validation.isValid,
      isReceipt: validation.isReceipt,
      isClear: validation.isClear,
      canExtract: validation.canExtract,
      reason: validation.reason,
      message: validation.message
    });
    
    if (!validation.isValid) {
      console.error(`❌ [API] Image validation failed: ${validation.message}`);
      return NextResponse.json(
        { 
          error: validation.message || 'Image validation failed',
          isValid: false
        },
        { status: 400 }
      );
    }

    console.log(`✅ [API] Validation passed, starting xAI processing...`);

    // Process with xAI
    console.log(`🤖 [API] Calling xAI processReceiptImage...`);
    const receiptData = await processReceiptImage(filepath);
    
    if (!receiptData) {
      console.error(`❌ [API] xAI processing returned null/undefined`);
      return NextResponse.json(
        { error: 'Failed to process receipt image' },
        { status: 500 }
      );
    }

    console.log(`✅ [API] xAI processing complete!`, {
      orderName: receiptData.orderName,
      location: receiptData.location || 'N/A',
      itemsCount: receiptData.items?.length || 0,
      total: receiptData.total,
      dateTime: receiptData.dateTime
    });

    // Save receipt data to processed-receipts directory
    const processedDir = path.resolve(process.cwd(), 'xAI/processed-receipts');
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
      console.log(`📂 [API] Created processed receipts directory: ${processedDir}`);
    }
    
    const outputFilename = `${path.parse(filename).name}.json`;
    const outputPath = path.join(processedDir, outputFilename);
    fs.writeFileSync(outputPath, JSON.stringify(receiptData, null, 2));
    console.log(`💾 [API] Saved receipt JSON to: ${outputPath}`);

    // Save to database as transaction with robust duplicate detection
    let transactionId: number | null = null;
    try {
      console.log(`💾 [API] Saving receipt to database as transaction...`);
      const { saveReceiptAsTransaction } = await import('@/lib/receipt-to-transaction');
      
      // Check if transaction already exists before saving
      const existingTxId = await saveReceiptAsTransaction(receiptData);
      transactionId = existingTxId;
      
      // Note: saveReceiptAsTransaction will return existing ID if duplicate is found
      // We can't easily detect if it's a duplicate vs new without additional tracking
      // But the function logs when duplicates are found
      console.log(`✅ [API] Transaction saved/processed with ID: ${transactionId}`);
    } catch (dbError) {
      console.error(`⚠️  [API] Failed to save transaction to database:`, dbError);
      if (dbError instanceof Error) {
        console.error(`⚠️  [API] Database error details:`, dbError.message);
        console.error(`⚠️  [API] Database error stack:`, dbError.stack);
      }
      // Continue even if database save fails - receipt is still saved to file system
    }

    console.log(`✅ [API] Receipt processing complete! Returning success response`);
    return NextResponse.json({
      success: true,
      receipt: receiptData,
      filename,
      transactionId: transactionId || null,
      message: transactionId 
        ? 'Receipt processed and saved successfully' 
        : 'Receipt processed but not saved to database'
    });
  } catch (error) {
    console.error('❌ [API] Error processing receipt:', error);
    if (error instanceof Error) {
      console.error('❌ [API] Error message:', error.message);
      console.error('❌ [API] Error stack:', error.stack);
    }
    return NextResponse.json(
      { 
        error: 'Failed to process receipt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}





