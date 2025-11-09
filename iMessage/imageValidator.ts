import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const XAI_API_KEY = process.env.XAI_API_KEY || '';
const XAI_API_URL = process.env.XAI_API_URL || 'https://api.x.ai/v1';
const XAI_VISION_MODEL = process.env.XAI_VISION_MODEL || 'grok-2-vision-latest';

export interface ValidationResult {
  isValid: boolean;
  isReceipt: boolean;
  reason: 'valid' | 'not_receipt' | 'blurry' | 'unreadable' | 'error';
  message: string;
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
 * Validate if an image is a valid receipt using xAI Grok Vision
 */
export async function validateReceiptImage(imagePath: string): Promise<ValidationResult> {
  try {
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return {
        isValid: false,
        isReceipt: false,
        reason: 'error',
        message: 'Image file not found'
      };
    }

    const base64Image = imageToBase64(imagePath);
    const mimeType = getMimeType(imagePath);

    // Call xAI Grok Vision API for validation
    console.log(`🔍 [Validator] Calling xAI vision model: ${XAI_VISION_MODEL}`);
    const response = await fetch(`${XAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: XAI_VISION_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a receipt validator. Analyze the image and determine:
1. Is this a receipt? (return "isReceipt": true/false)
2. Is the image clear enough to read? (return "isClear": true/false)
3. Can you extract receipt information? (return "canExtract": true/false)

Return ONLY valid JSON in this format:
{
  "isReceipt": true/false,
  "isClear": true/false,
  "canExtract": true/false,
  "reason": "string explaining the result"
}

Possible reasons:
- "valid_receipt" - This is a clear, readable receipt
- "not_a_receipt" - This is not a receipt (e.g., random photo, document, etc.)
- "too_blurry" - Image is too blurry to read
- "unreadable" - Cannot extract information from the image
- "low_quality" - Image quality is too poor

Return ONLY the JSON object, no additional text.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please validate if this image is a readable receipt. Return JSON with isReceipt, isClear, canExtract, and reason.'
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
        max_tokens: 500,
        temperature: 0.1,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`xAI API error (${response.status}):`, errorText);
      return {
        isValid: false,
        isReceipt: false,
        reason: 'error',
        message: `API error: ${response.status}`
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return {
        isValid: false,
        isReceipt: false,
        reason: 'error',
        message: 'No response from xAI'
      };
    }

    // Parse the JSON response
    let jsonString = content.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/```\n?/g, '');
    }

    const validationData = JSON.parse(jsonString);
    
    // Determine validation result
    const isReceipt = validationData.isReceipt === true;
    const isClear = validationData.isClear === true;
    const canExtract = validationData.canExtract === true;
    const reason = validationData.reason || 'unknown';

    // Valid receipt: is a receipt, clear, and can extract
    if (isReceipt && isClear && canExtract) {
      return {
        isValid: true,
        isReceipt: true,
        reason: 'valid',
        message: 'Valid receipt - ready to process'
      };
    }

    // Not a receipt
    if (!isReceipt || reason.includes('not_a_receipt')) {
      return {
        isValid: false,
        isReceipt: false,
        reason: 'not_receipt',
        message: 'This does not appear to be a receipt. Please send a receipt image.'
      };
    }

    // Too blurry
    if (!isClear || reason.includes('blurry') || reason.includes('low_quality')) {
      return {
        isValid: false,
        isReceipt: isReceipt,
        reason: 'blurry',
        message: 'Image is too blurry to process. Please send a clearer photo of the receipt.'
      };
    }

    // Unreadable
    if (!canExtract || reason.includes('unreadable')) {
      return {
        isValid: false,
        isReceipt: isReceipt,
        reason: 'unreadable',
        message: 'Cannot read the receipt. Please send a clearer, well-lit photo.'
      };
    }

    // Default: not valid
    return {
      isValid: false,
      isReceipt: isReceipt,
      reason: 'error',
      message: 'Unable to validate receipt. Please try again with a clearer image.'
    };

  } catch (error) {
    console.error(`Error validating image ${imagePath}:`, error);
    return {
      isValid: false,
      isReceipt: false,
      reason: 'error',
      message: error instanceof Error ? error.message : 'Validation error occurred'
    };
  }
}

/**
 * Validate a single image file
 */
export async function validateImageFile(imagePath: string): Promise<ValidationResult> {
  return await validateReceiptImage(imagePath);
}

