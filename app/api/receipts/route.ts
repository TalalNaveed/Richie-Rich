import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';

// Note: In production, you'd want to import these properly
// For now, we'll read the JSON files directly
const RECEIPTS_DIR = path.resolve(process.cwd(), 'xAI/processed-receipts');

export interface ReceiptData {
  merchantName: string;
  merchantAddress?: string;
  date: string;
  time?: string;
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
  paymentMethod?: string;
  lastFourDigits?: string;
  receiptNumber?: string;
  categoryTags?: string[];
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
        r.merchantName.toLowerCase().includes(merchant.toLowerCase())
      );
    }

    if (category) {
      receipts = receipts.filter(r => 
        r.categoryTags?.some(tag => 
          tag.toLowerCase().includes(category.toLowerCase())
        )
      );
    }

    if (startDate) {
      const start = new Date(startDate);
      receipts = receipts.filter(r => new Date(r.date) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      receipts = receipts.filter(r => new Date(r.date) <= end);
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
 * POST /api/receipts - Process a new receipt image
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Save the uploaded image to the saved-images directory
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const imagesDir = path.resolve(process.cwd(), 'iMessage/saved-images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const filename = `upload-${Date.now()}-${file.name}`;
    const filepath = path.join(imagesDir, filename);
    await writeFile(filepath, buffer);

    return NextResponse.json({
      message: 'Receipt uploaded successfully',
      filename,
      note: 'Run the receipt processor to extract data from this image'
    });
  } catch (error) {
    console.error('Error uploading receipt:', error);
    return NextResponse.json(
      { error: 'Failed to upload receipt' },
      { status: 500 }
    );
  }
}





