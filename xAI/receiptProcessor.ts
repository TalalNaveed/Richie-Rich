import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Path to the saved images directory from iMessage
const IMAGES_DIR = path.resolve(__dirname, '../iMessage/saved-images');
const OUTPUT_DIR = path.resolve(__dirname, 'processed-receipts');

// Initialize xAI Grok client
const XAI_API_KEY = process.env.XAI_API_KEY || '';
const XAI_API_URL = process.env.XAI_API_URL || 'https://api.x.ai/v1';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY not found in environment variables!');
  console.error('Please add XAI_API_KEY to your .env file');
}

// Receipt data structure
export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface ReceiptData {
  merchantName: string;
  merchantAddress?: string;
  date: string;
  time?: string;
  items: ReceiptItem[];
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
 * Convert image file to base64 encoding
 */
function imageToBase64(imagePath: string): string {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

/**
 * Get the mime type based on file extension
 */
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  return mimeTypes[ext] || 'image/jpeg';
}

/**
 * Process a single receipt image using xAI Grok Vision API
 */
async function processReceiptImage(imagePath: string): Promise<ReceiptData | null> {
  try {
    console.log(`Processing image: ${path.basename(imagePath)}`);
    
    const base64Image = imageToBase64(imagePath);
    const mimeType = getMimeType(imagePath);

    // Call xAI Grok Vision API
    const response = await fetch(`${XAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-2-vision-1212',  // xAI Grok Vision model
        messages: [
          {
            role: 'system',
            content: `You are a receipt parser. First, determine if the image is actually a receipt. If it's not a receipt, return {"isReceipt": false, "error": "This does not appear to be a receipt"}. If the image is too blurry or unreadable, return {"isReceipt": false, "error": "Image is too blurry to process"} or {"isReceipt": false, "error": "Image is unreadable"}.

If it IS a receipt, extract all relevant information and return ONLY valid JSON following this exact structure:
{
  "isReceipt": true,
  "merchantName": "string",
  "merchantAddress": "string (optional)",
  "date": "YYYY-MM-DD format",
  "time": "HH:MM format (optional)",
  "items": [
    {
      "name": "item name",
      "quantity": number,
      "price": number (unit price),
      "total": number (line total)
    }
  ],
  "subtotal": number,
  "tax": number,
  "tip": number (optional),
  "total": number,
  "paymentMethod": "string (optional, e.g., 'Credit Card', 'Cash')",
  "lastFourDigits": "string (optional, last 4 digits of card)",
  "receiptNumber": "string (optional)",
  "categoryTags": ["array of categories like 'food', 'groceries', 'retail', etc."]
}

Important:
- ALWAYS include "isReceipt": true or false
- Return ONLY the JSON object, no additional text
- All monetary values should be numbers (not strings)
- If a field is not found, omit it or use null
- Date must be in YYYY-MM-DD format
- If image is blurry/unreadable/not a receipt, return isReceipt: false with error message`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please extract all receipt information from this image and return it as valid JSON.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1, // Low temperature for consistent parsing
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`xAI API error (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('No content received from xAI Grok');
      return null;
    }

    // Parse the JSON response
    // Remove markdown code blocks if present
    let jsonString = content.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/```\n?/g, '');
    }

    const parsedData = JSON.parse(jsonString);
    
    // Check if it's actually a receipt
    if (parsedData.isReceipt === false) {
      const errorMsg = parsedData.error || 'Unknown error';
      console.log(`⚠️  Not a receipt: ${errorMsg}`);
      
      // Save error response for checking
      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }
      const outputFilename = `${path.parse(imagePath).name}.json`;
      const outputPath = path.join(OUTPUT_DIR, outputFilename);
      fs.writeFileSync(outputPath, JSON.stringify({ isReceipt: false, error: errorMsg }, null, 2));
      
      return null;
    }
    
    // Remove isReceipt field for compatibility
    const { isReceipt, ...receiptData } = parsedData;
    console.log(`✅ Successfully processed: ${receiptData.merchantName || 'Receipt'}`);
    
    return receiptData as ReceiptData;
  } catch (error) {
    console.error(`Error processing image ${imagePath}:`, error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return null;
  }
}

/**
 * Process all images in the saved-images directory
 */
async function processAllReceipts(): Promise<void> {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Check if images directory exists
    if (!fs.existsSync(IMAGES_DIR)) {
      console.error(`Images directory not found: ${IMAGES_DIR}`);
      console.log('Please ensure images have been saved from iMessage first.');
      return;
    }

    // Read all files from the images directory
    const files = fs.readdirSync(IMAGES_DIR);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    if (imageFiles.length === 0) {
      console.log('No image files found in the saved-images directory.');
      return;
    }

    console.log(`Found ${imageFiles.length} image(s) to process`);

    const results: Array<{ filename: string; data: ReceiptData | null }> = [];

    // Process each image
    for (const filename of imageFiles) {
      const imagePath = path.join(IMAGES_DIR, filename);
      const receiptData = await processReceiptImage(imagePath);
      
      results.push({
        filename,
        data: receiptData
      });

      // Save individual receipt JSON
      if (receiptData) {
        const outputFilename = `${path.parse(filename).name}.json`;
        const outputPath = path.join(OUTPUT_DIR, outputFilename);
        fs.writeFileSync(outputPath, JSON.stringify(receiptData, null, 2));
        console.log(`💾 Saved JSON to: ${outputPath}`);
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Save all results in a single file
    const allResultsPath = path.join(OUTPUT_DIR, 'all-receipts.json');
    fs.writeFileSync(allResultsPath, JSON.stringify(results, null, 2));
    console.log(`\n✅ Processed ${results.length} images`);
    console.log(`📊 All results saved to: ${allResultsPath}`);

    // Print summary
    const successCount = results.filter(r => r.data !== null).length;
    console.log(`\n📈 Summary:`);
    console.log(`   Success: ${successCount}/${results.length}`);
    console.log(`   Failed: ${results.length - successCount}/${results.length}`);

  } catch (error) {
    console.error('Error processing receipts:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

/**
 * Process a single receipt image by filename
 */
export async function processSingleReceipt(filename: string): Promise<ReceiptData | null> {
  const imagePath = path.join(IMAGES_DIR, filename);
  
  if (!fs.existsSync(imagePath)) {
    console.error(`Image not found: ${imagePath}`);
    return null;
  }

  const receiptData = await processReceiptImage(imagePath);
  
  if (receiptData) {
    // Save the result
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    const outputFilename = `${path.parse(filename).name}.json`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);
    fs.writeFileSync(outputPath, JSON.stringify(receiptData, null, 2));
    console.log(`💾 Saved JSON to: ${outputPath}`);
  }
  
  return receiptData;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting receipt processing...\n');
  processAllReceipts()
    .then(() => console.log('\n✨ Done!'))
    .catch(err => console.error('Fatal error:', err));
}

export default processAllReceipts;

