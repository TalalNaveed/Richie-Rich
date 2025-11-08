import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { IMessageSDK, Message } from '@photon-ai/imessage-kit';
import dotenv from 'dotenv';
import { validateReceiptImage, ValidationResult } from './imageValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SAVE_DIR = path.resolve(__dirname, 'saved-images');
const PROCESSED_FILE = path.resolve(__dirname, '.processed-images.json');

// Configuration from environment
const TARGET_NUMBER = process.env.IMESSAGE_TARGET_NUMBER || '';
const AUTO_PROCESS = process.env.IMESSAGE_AUTO_PROCESS === 'true';
const MAX_PARALLEL = parseInt(process.env.MAX_PARALLEL_PROCESSING || '5'); // Max parallel processing

// Track processed images by filename
interface ProcessedImages {
  processedFilenames: Set<string>;
  lastUpdated: string;
}

let processedImages: ProcessedImages = {
  processedFilenames: new Set<string>(),
  lastUpdated: new Date().toISOString()
};

/**
 * Load processed images list
 */
function loadProcessedImages(): void {
  try {
    if (fs.existsSync(PROCESSED_FILE)) {
      const data = fs.readFileSync(PROCESSED_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      processedImages.processedFilenames = new Set(parsed.processedFilenames || []);
      processedImages.lastUpdated = parsed.lastUpdated || new Date().toISOString();
      console.log(`📋 Loaded ${processedImages.processedFilenames.size} processed image(s)`);
    }
  } catch (error) {
    processedImages = {
      processedFilenames: new Set<string>(),
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Save processed images list
 */
function saveProcessedImages(): void {
  try {
    const data = {
      processedFilenames: Array.from(processedImages.processedFilenames),
      lastUpdated: processedImages.lastUpdated
    };
    fs.writeFileSync(PROCESSED_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('⚠️  Error saving processed images:', error);
  }
}

/**
 * Check if image filename has been processed
 */
function isImageProcessed(filename: string): boolean {
  return processedImages.processedFilenames.has(filename);
}

/**
 * Mark image as processed
 */
function markImageAsProcessed(filename: string): void {
  processedImages.processedFilenames.add(filename);
  processedImages.lastUpdated = new Date().toISOString();
  saveProcessedImages();
}

// Normalize phone number (remove spaces, parentheses, dashes)
function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[\s\(\)\-]/g, '');
}

/**
 * Dummy function for text processing - replace with your AI logic later
 */
async function processTextMessage(text: string, sender: string): Promise<void> {
  console.log(`📝 Text message received: "${text}"`);
  console.log(`💡 TODO: Process with AI / pipe to your logic`);
  // TODO: Add your text processing logic here
}

/**
 * Process a single image (validation + saving + xAI processing)
 */
async function processSingleImage(
  sdk: IMessageSDK,
  att: any,
  normalizedNumber: string,
  sender: string
): Promise<{ success: boolean; filename?: string; error?: string }> {
  try {
    const filename = path.basename(att.path);
    
    // Check if already processed by filename
    if (isImageProcessed(filename)) {
      console.log(`⏭️  Skipping ${filename} - already processed`);
      return { success: false, filename, error: 'Already processed' };
    }

    // Also check if file already exists in saved-images
    const dest = path.join(SAVE_DIR, filename);
    if (fs.existsSync(dest)) {
      console.log(`⏭️  Skipping ${filename} - file already exists`);
      markImageAsProcessed(filename); // Mark as processed
      return { success: false, filename, error: 'File already exists' };
    }

    // VALIDATE IMAGE FIRST
    console.log(`🔍 Validating image: ${filename}`);
    const validation = await validateReceiptImage(att.path);
    
    if (!validation.isValid) {
      // Send feedback to user about validation failure
      console.log(`❌ Validation failed: ${validation.message}`);
      try {
        await sdk.send(normalizedNumber || sender, validation.message);
      } catch (sendError) {
        console.error('Could not send validation feedback:', sendError);
      }
      return { success: false, error: validation.message };
    }

    console.log(`✅ Validation passed: ${validation.message}`);

    // Copy the file to your folder
    fs.copyFileSync(att.path, dest);
    console.log(`✅ Saved image to ${dest}`);

    // Mark as processed
    markImageAsProcessed(filename);

    // Auto-process with xAI if enabled
    if (AUTO_PROCESS) {
      console.log(`🤖 Auto-processing with xAI...`);
      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execPromise = promisify(exec);
        
        const xaiDir = path.resolve(__dirname, '../xAI');
        await execPromise(`cd "${xaiDir}" && npm run process`, { timeout: 60000 });
        console.log(`✨ Processing complete for ${filename}!`);
      } catch (processError) {
        console.error(`⚠️  Auto-process failed for ${filename}:`, processError);
        return { success: false, filename, error: 'Processing failed' };
      }
    }

    // Send success message
    try {
      await sdk.send(normalizedNumber || sender, {
        text: '✅ Receipt received and processed!'
      });
    } catch (sendError) {
      // Ignore send errors
    }

    return { success: true, filename };

  } catch (fileError) {
    console.error(`Error processing attachment ${att.path}:`, fileError);
    return { success: false, error: fileError instanceof Error ? fileError.message : 'Unknown error' };
  }
}

/**
 * Process messages and save images - original working code
 */
async function processAndSaveImages(fromNumber: string) {
  const sdk = new IMessageSDK({ debug: true });

  try {
    // Load processed images list
    loadProcessedImages();

    // Normalize the phone number to match database format
    const normalizedNumber = normalizePhoneNumber(fromNumber);
    console.log(`Looking for messages from: ${normalizedNumber || 'ALL'}`);

    const result = await sdk.getMessages({
      sender: normalizedNumber || undefined,
      unreadOnly: true,  // Only get unread messages
      limit: 50
    });

    // Extract messages array from the response object
    const msgs: Message[] = (result && typeof result === 'object' && 'messages' in result)
      ? (result as any).messages || []
      : Array.isArray(result)
      ? result
      : [];

    if (!msgs || msgs.length === 0) {
      console.log('No messages found');
      return;
    }

    console.log(`Found ${msgs.length} message(s) (Total: ${(result as any)?.total || msgs.length}, Unread: ${(result as any)?.unreadCount || 0})`);

    // Ensure local folder exists
    if (!fs.existsSync(SAVE_DIR)) {
      fs.mkdirSync(SAVE_DIR, { recursive: true });
    }

    let imageCount = 0;
    const imageProcessingPromises: Promise<{ success: boolean; filename?: string; error?: string }>[] = [];

    for (const msg of msgs) {
      // Process text if present
      if (msg.text && msg.text.trim().length > 0) {
        await processTextMessage(msg.text, msg.sender);
      }

      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.mimeType?.startsWith('image/')) {
            // Add to parallel processing queue
            const normalizedNumber = normalizePhoneNumber(fromNumber);
            imageProcessingPromises.push(
              processSingleImage(sdk, att, normalizedNumber, msg.sender)
            );
          }
        }
      }
    }

    // Process all images in parallel (with concurrency limit)
    if (imageProcessingPromises.length > 0) {
      console.log(`\n📦 Processing ${imageProcessingPromises.length} image(s) in parallel (max ${MAX_PARALLEL} concurrent)...`);
      
      // Process in batches to limit concurrency
      const batches: Promise<{ success: boolean; filename?: string; error?: string }>[][] = [];
      for (let i = 0; i < imageProcessingPromises.length; i += MAX_PARALLEL) {
        batches.push(imageProcessingPromises.slice(i, i + MAX_PARALLEL));
      }

      let successCount = 0;
      let failCount = 0;

      for (const batch of batches) {
        const results = await Promise.allSettled(batch);
        
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value.success) {
            successCount++;
            imageCount++;
          } else {
            failCount++;
          }
        }
      }

      console.log(`\n📊 Processing complete:`);
      console.log(`   ✅ Success: ${successCount}`);
      console.log(`   ❌ Failed: ${failCount}`);
    }

    if (imageCount === 0) {
      console.log('No valid receipt images found in the messages');
    } else {
      console.log(`✅ Successfully processed ${imageCount} receipt image(s)`);
    }
  } catch (err) {
    console.error('Error while saving images:', err);
    if (err instanceof Error) {
      console.error('Error details:', err.message);
      console.error('Stack:', err.stack);
    }
  } finally {
    await sdk.close();
  }
}

// Run the processor
const targetNumber = TARGET_NUMBER || '';
processAndSaveImages(targetNumber).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
