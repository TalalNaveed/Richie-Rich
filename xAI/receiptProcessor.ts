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

// Initialize xAI Grok client (for validation and autocompletion)
const XAI_API_KEY = process.env.XAI_API_KEY || '';
const XAI_API_URL = process.env.XAI_API_URL || 'https://api.x.ai/v1';
const XAI_VISION_MODEL = process.env.XAI_VISION_MODEL || 'grok-2-vision-latest';
const XAI_TEXT_MODEL = process.env.XAI_TEXT_MODEL || 'grok-3';

// Initialize Google Gemini client (for OCR processing)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_VISION_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY not found in environment variables!');
  console.error('Please add XAI_API_KEY to your .env file');
}

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in environment variables!');
  console.error('Please add GEMINI_API_KEY to your .env file');
}

// Receipt data structure - updated format
export interface ReceiptItem {
  name: string;
  quantity: number;
  ppu: number; // price per unit
  price: number; // total price for this line item (ppu * quantity)
}

export interface ReceiptData {
  orderName: string; // merchant/store name
  items: ReceiptItem[];
  location?: string; // store location/address
  prices: number[]; // array of total prices for each item
  ppu: number[]; // array of price per unit for each item
  quantities: number[]; // array of quantities for each item
  dateTime: string; // ISO format datetime string
  subtotal?: number;
  tax?: number;
  tip?: number;
  total: number;
}

function normalizeJsonString(input: string): string {
  return input
    .replace(/\u0000/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

function sanitizeTrailingCommas(input: string): string {
  return input.replace(/,\s*([}\]])/g, '$1');
}

function tryParseReceiptJson(raw: string): any | null {
  const attempts = new Set<string>();
  const normalized = normalizeJsonString(raw.trim());
  attempts.add(normalized);

  const firstBrace = normalized.indexOf('{');
  const lastBrace = normalized.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    attempts.add(normalized.slice(firstBrace, lastBrace + 1));
  }

  const noTrailing = sanitizeTrailingCommas(normalized);
  attempts.add(noTrailing);
  if (firstBrace !== -1 && lastBrace !== -1) {
    attempts.add(sanitizeTrailingCommas(normalized.slice(firstBrace, lastBrace + 1)));
  }

  for (const attempt of attempts) {
    const candidate = attempt.trim();
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch (err) {
      // continue trying other candidates
    }
  }

  return null;
}

async function repairReceiptJson(raw: string): Promise<any | null> {
  try {
    console.warn('⚠️  [Grok] Attempting to repair malformed JSON via text model...');
    const repairPrompt = `The following is malformed JSON output from a receipt OCR model.\n` +
      `Fix the JSON so that it is syntactically valid. It should be a JSON array of objects with this format:\n` +
      `[\n  { "item": "item name", "price": "price as string" },\n  { "item": "item name", "price": "price as string" }\n]\n` +
      `If any line is unreadable, use { "item": null, "price": null }.\n` +
      `Do NOT invent data. Respond with valid JSON array only.\n\n` +
      `Malformed JSON:\n"""${raw}"""`;

    const response = await fetch(`${XAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: XAI_TEXT_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You fix JSON outputs. Reply with VALID JSON only, no explanations.'
          },
          {
            role: 'user',
            content: repairPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0
      })
    });

    if (!response.ok) {
      console.warn(`⚠️  [Grok] JSON repair failed with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('⚠️  [Grok] JSON repair returned empty content');
      return null;
    }

    const repaired = tryParseReceiptJson(content);
    if (repaired) {
      console.log('✅ [Grok] JSON repair succeeded');
    }
    return repaired;
  } catch (error) {
    console.warn('⚠️  [Grok] JSON repair encountered an error:', error);
    return null;
  }
}

function saveRawResponse(imagePath: string, rawContent: string): void {
  try {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    const baseName = path.parse(imagePath).name;
    const debugPath = path.join(OUTPUT_DIR, `${baseName}-raw-response.json.txt`);
    fs.writeFileSync(debugPath, rawContent);
    console.warn(`⚠️  [xAI] Saved raw response for debugging: ${debugPath}`);
  } catch (error) {
    console.warn('⚠️  [xAI] Failed to save raw response:', error);
  }
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
 * Autocomplete item names by comparing against Walmart catalog using Grok
 */
async function autocompleteItemNames(items: ReceiptItem[], orderName: string): Promise<ReceiptItem[]> {
  console.log(`🔍 [xAI] Starting item name autocompletion for ${items.length} items...`);
  
  // If orderName contains "walmart" (case insensitive), use Walmart catalog
  const isWalmart = orderName.toLowerCase().includes('walmart');
  const storeContext = isWalmart ? 'Walmart' : 'common retail stores';
  
  try {
    // Create a prompt with all item names
    const itemNamesList = items.map((item, idx) => `${idx + 1}. "${item.name}"`).join('\n');
    
    const autocompletePrompt = `You are a product name standardization assistant. Given a list of product names from a ${storeContext} receipt, standardize and autocomplete each name by comparing it against ${storeContext}'s product catalog.

CRITICAL RULES:
- If the name is already clear and complete, keep it EXACTLY as-is - DO NOT modify it
- Only autocomplete if the name is clearly abbreviated, partial, or truncated
- DO NOT invent product names that don't exist
- DO NOT change names that are already readable
- Base autocompletions ONLY on actual ${storeContext} product catalog knowledge

For each item, return the standardized name. Return ONLY a JSON array of names in the same order:
["Name 1", "Name 2", ...]

Original item names from receipt:
${itemNamesList}

Return only the JSON array, no additional text or explanations.`;

    console.log(`🤖 [xAI] Calling Grok for name autocompletion using model: ${XAI_TEXT_MODEL}...`);
    const response = await fetch(`${XAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: XAI_TEXT_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a product name standardization assistant. Return ONLY valid JSON arrays, no additional text.`
          },
          {
            role: 'user',
            content: autocompletePrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.1, // Low temperature for consistency in name autocompletion
      })
    });

    if (!response.ok) {
      console.warn(`⚠️  [xAI] Autocompletion API error (${response.status}), using original names`);
      return items;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.warn(`⚠️  [xAI] No autocompletion response, using original names`);
      return items;
    }

    // Parse the JSON array
    let jsonString = content.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/```\n?/g, '');
    }

    const standardizedNames: string[] = JSON.parse(jsonString);
    
    if (!Array.isArray(standardizedNames) || standardizedNames.length !== items.length) {
      console.warn(`⚠️  [xAI] Invalid autocompletion response, using original names`);
      return items;
    }

    // Update item names
    const autocompletedItems = items.map((item, idx) => ({
      ...item,
      name: standardizedNames[idx] || item.name
    }));

    console.log(`✅ [xAI] Autocompleted ${autocompletedItems.length} item names`);
    autocompletedItems.forEach((item, idx) => {
      if (item.name !== items[idx].name) {
        console.log(`   "${items[idx].name}" → "${item.name}"`);
      }
    });

    return autocompletedItems;
  } catch (error) {
    console.warn(`⚠️  [xAI] Error during autocompletion, using original names:`, error);
    return items;
  }
}

/**
 * Process a single receipt image using Google Gemini for OCR, then Grok for autocompletion
 */
export async function processReceiptImage(imagePath: string): Promise<ReceiptData | null> {
  try {
    console.log(`🔍 [Gemini] Processing image: ${path.basename(imagePath)}`);
    console.log(`🔍 [Gemini] Image path: ${imagePath}`);
    
    const base64Image = imageToBase64(imagePath);
    const mimeType = getMimeType(imagePath);
    console.log(`🔍 [Gemini] Image converted to base64, size: ${(base64Image.length / 1024).toFixed(2)} KB, mimeType: ${mimeType}`);

    // Step 1: Use Gemini for OCR extraction
    console.log(`🔍 [Gemini] Calling Google Gemini API at ${GEMINI_API_URL}/models/${GEMINI_VISION_MODEL}:generateContent...`);
    const geminiResponse = await fetch(`${GEMINI_API_URL}/models/${GEMINI_VISION_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are an OCR engine. Do not guess or fill in missing text.

TASK:

1. Read the text *exactly* as it appears in the image of the receipt.

2. Output ONLY a JSON array of { "item": "...", "price": "..." }.

3. If any line is unreadable, output it as { "item": null, "price": null }.

4. Do not write explanations, summaries, or additional commentary.`
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: 2000,
        }
      })
    });

    console.log(`🔍 [Gemini] API response status: ${geminiResponse.status} ${geminiResponse.statusText}`);
    
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(`❌ [Gemini] API error (${geminiResponse.status}):`, errorText);
      return null;
    }

    const geminiData = await geminiResponse.json();
    console.log(`🔍 [Gemini] API response received, parsing content...`);
    
    const geminiContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!geminiContent) {
      console.error('❌ [Gemini] No content received from Gemini');
      console.error('❌ [Gemini] Response data:', JSON.stringify(geminiData, null, 2));
      return null;
    }

    console.log(`🔍 [Gemini] Content length: ${geminiContent.length} characters`);
    console.log(`🔍 [Gemini] Content preview: ${geminiContent.substring(0, 200)}...`);

    // Parse the JSON response from Gemini
    // Remove markdown code blocks if present
    let jsonString = geminiContent.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      console.log(`🔍 [Gemini] Removed markdown code blocks (json)`);
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/```\n?/g, '');
      console.log(`🔍 [Gemini] Removed markdown code blocks`);
    }

    console.log(`🔍 [Gemini] Parsing JSON string...`);
    let parsedData = tryParseReceiptJson(jsonString);

    if (!parsedData) {
      console.warn('⚠️  [Gemini] Initial JSON parse failed, attempting repair...');
      parsedData = await repairReceiptJson(jsonString);
    }

    if (!parsedData) {
      console.error('❌ [Gemini] Unable to parse or repair JSON output');
      saveRawResponse(imagePath, jsonString);
      return null;
    }

    console.log(`🔍 [Gemini] JSON parsed successfully, received ${Array.isArray(parsedData) ? parsedData.length : 'non-array'} items`);

    // Check if we got an array of items
    if (!Array.isArray(parsedData)) {
      console.error('❌ [Gemini] Expected array of items, got:', typeof parsedData);
      saveRawResponse(imagePath, jsonString);
      return null;
    }

    // Filter out null items
    const validItems = parsedData.filter(item => item && item.item !== null && item.price !== null);

    if (validItems.length === 0) {
      console.warn('⚠️  [Gemini] No valid items found in receipt');
      return null;
    }

    // Step 2: Convert to ReceiptData format (before autocompletion)
    let receiptData: ReceiptData = {
      orderName: 'Unknown Merchant', // OCR only provides items and prices
      items: validItems.map((item, index) => ({
        name: item.item || `Item ${index + 1}`,
        quantity: 1, // Default to 1 since OCR doesn't provide quantities
        ppu: parseFloat(item.price) || 0, // Assume ppu = total price
        price: parseFloat(item.price) || 0
      })),
      prices: validItems.map(item => parseFloat(item.price) || 0),
      ppu: validItems.map(item => parseFloat(item.price) || 0),
      quantities: validItems.map(() => 1),
      dateTime: new Date().toISOString(),
      total: validItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0)
    };

    console.log(`✅ [Gemini] Successfully parsed receipt: ${validItems.length} items - $${receiptData.total}`);

    // Step 3: Use Grok to autocomplete short-form item names
    console.log(`🤖 [Grok] Autocompleting item names from OCR output...`);
    const autocompletedItems = await autocompleteItemNames(receiptData.items, receiptData.orderName);
    receiptData.items = autocompletedItems;

    // Update arrays to match autocompleted items
    receiptData.prices = receiptData.items.map(item => item.price);
    receiptData.ppu = receiptData.items.map(item => item.ppu);
    receiptData.quantities = receiptData.items.map(item => item.quantity);

    console.log(`✅ [Grok] Autocompletion complete. Receipt data ready:`, {
      itemCount: receiptData.items.length,
      total: receiptData.total
    });
    
    return receiptData as ReceiptData;
  } catch (error) {
    console.error(`❌ [Gemini/Grok] Error processing image ${imagePath}:`, error);
    if (error instanceof Error) {
      console.error('❌ [Gemini/Grok] Error details:', error.message);
      console.error('❌ [Gemini/Grok] Error stack:', error.stack);
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

