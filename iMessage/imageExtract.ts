import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { IMessageSDK, Message } from '@photon-ai/imessage-kit';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SAVE_DIR = path.resolve(__dirname, 'saved-images');
const HISTORY_FILE = path.resolve(__dirname, '.message-history.json');

// Configuration from environment
const TARGET_NUMBER = process.env.IMESSAGE_TARGET_NUMBER || '';
const WATCH_MODE = process.env.IMESSAGE_WATCH_MODE === 'true';
const AUTO_PROCESS = process.env.IMESSAGE_AUTO_PROCESS === 'true';

// Message history to track processed messages
interface MessageHistory {
  processedHashes: Set<string>;
  lastProcessed: string;
}

let history: MessageHistory = {
  processedHashes: new Set<string>(),
  lastProcessed: new Date().toISOString()
};

// Track last processed timestamp to only get NEW messages
let lastProcessedTimestamp = new Date();

/**
 * Generate a hash for a message to track if it's been processed
 */
function hashMessage(message: Message): string {
  const data = `${message.id}-${message.date.toISOString()}-${message.sender}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a hash for an attachment
 */
function hashAttachment(attachmentPath: string, messageId: string): string {
  try {
    const stats = fs.statSync(attachmentPath);
    const data = `${attachmentPath}-${stats.size}-${stats.mtimeMs}-${messageId}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  } catch (error) {
    return crypto.createHash('sha256').update(`${attachmentPath}-${messageId}`).digest('hex');
  }
}

/**
 * Load message history from disk
 */
function loadHistory(): void {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      history.processedHashes = new Set(parsed.processedHashes || []);
      history.lastProcessed = parsed.lastProcessed || new Date().toISOString();
      lastProcessedTimestamp = new Date(parsed.lastProcessed || Date.now());
      console.log(`📋 Loaded history: ${history.processedHashes.size} processed messages`);
    }
  } catch (error) {
    history = {
      processedHashes: new Set<string>(),
      lastProcessed: new Date().toISOString()
    };
    lastProcessedTimestamp = new Date();
  }
}

/**
 * Save message history to disk
 */
function saveHistory(): void {
  try {
    const data = {
      processedHashes: Array.from(history.processedHashes),
      lastProcessed: history.lastProcessed
    };
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('⚠️  Error saving history:', error);
  }
}

/**
 * Check if a message has already been processed
 */
function isProcessed(hash: string): boolean {
  return history.processedHashes.has(hash);
}

/**
 * Mark a message as processed
 */
function markAsProcessed(hash: string, timestamp: Date): void {
  history.processedHashes.add(hash);
  history.lastProcessed = timestamp.toISOString();
  lastProcessedTimestamp = timestamp;
  saveHistory();
}

/**
 * Normalize phone number (remove spaces, parentheses, dashes)
 */
function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[\s\(\)\-]/g, '');
}

/**
 * Dummy function for text processing - replace with your AI logic later
 */
async function processTextMessage(text: string, sender: string): Promise<void> {
  console.log(`   📝 Text message received: "${text}"`);
  console.log(`   💡 TODO: Process with AI / pipe to your logic`);
  // TODO: Add your text processing logic here
}

/**
 * Process single image with xAI and return status
 */
async function processImageWithXAI(imagePath: string): Promise<{ success: boolean; isReceipt: boolean; error?: string }> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execPromise = promisify(exec);
    
    const xaiDir = path.resolve(__dirname, '../xAI');
    const filename = path.basename(imagePath);
    
    // Call xAI processor
    const { stdout, stderr } = await execPromise(
      `cd "${xaiDir}" && npm run process:single "${filename}"`,
      { timeout: 60000 }
    );
    
    // Check if JSON file was created
    const jsonPath = path.join(xaiDir, 'processed-receipts', `${path.parse(filename).name}.json`);
    
    if (fs.existsSync(jsonPath)) {
      // Read the JSON to check result
      const receiptData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      
      // Check if it's marked as not a receipt
      if (receiptData.isReceipt === false) {
        return { success: true, isReceipt: false };
      }
      
      // Check if it has receipt-like data
      const hasReceiptData = receiptData.merchantName && 
                            (receiptData.items?.length > 0 || receiptData.total);
      
      if (hasReceiptData) {
        return { success: true, isReceipt: true };
      } else {
        // Not a receipt
        return { success: true, isReceipt: false };
      }
    }
    
    // Check stdout/stderr for error messages
    const output = (stdout + stderr).toLowerCase();
    if (output.includes('not a receipt') || output.includes('does not appear')) {
      return { success: true, isReceipt: false };
    }
    if (output.includes('blur') || output.includes('blurry')) {
      return { success: false, isReceipt: false, error: 'blurry' };
    }
    if (output.includes('unreadable') || output.includes('cannot read')) {
      return { success: false, isReceipt: false, error: 'unreadable' };
    }
    
    return { success: false, isReceipt: false, error: 'unreadable' };
    
  } catch (error: any) {
    console.error(`   ⚠️  xAI processing error:`, error.message);
    
    // Check error message for clues
    const errorMsg = (error.message || error.stderr || '').toLowerCase();
    if (errorMsg.includes('blur') || errorMsg.includes('blurry')) {
      return { success: false, isReceipt: false, error: 'blurry' };
    }
    if (errorMsg.includes('not a receipt') || errorMsg.includes('does not appear')) {
      return { success: true, isReceipt: false };
    }
    
    return { success: false, isReceipt: false, error: 'unreadable' };
  }
}

/**
 * Process a single new message (only processes if NEW)
 */
async function processNewMessage(sdk: IMessageSDK, message: Message): Promise<void> {
  const messageHash = hashMessage(message);
  
  // Skip if already processed
  if (isProcessed(messageHash)) {
    return; // Silent skip - already processed
  }

  // Only process messages newer than last processed timestamp
  if (message.date <= lastProcessedTimestamp) {
    console.log(`⏭️  Skipping old message (before ${lastProcessedTimestamp.toISOString()})`);
    return;
  }

  // Process text if present
  if (message.text && message.text.trim().length > 0) {
    await processTextMessage(message.text, message.sender);
  }

  // Process images
  if (message.attachments && message.attachments.length > 0) {
    const imageAttachments = message.attachments.filter(att => att.mimeType?.startsWith('image/'));
    
    if (imageAttachments.length > 0) {
      // Ensure save directory exists
      if (!fs.existsSync(SAVE_DIR)) {
        fs.mkdirSync(SAVE_DIR, { recursive: true });
      }

      for (const att of imageAttachments) {
        const attachmentHash = hashAttachment(att.path, message.id);
        
        // Skip if already processed
        if (isProcessed(attachmentHash)) {
          continue;
        }

        try {
          // Verify file exists
          if (!fs.existsSync(att.path)) {
            console.log(`   ⚠️  File not found: ${path.basename(att.path)}`);
            continue;
          }

          const timestamp = Date.now();
          const ext = path.extname(att.path);
          const filename = `receipt-${timestamp}${ext}`;
          const dest = path.join(SAVE_DIR, filename);

          // Copy the file
          fs.copyFileSync(att.path, dest);
          console.log(`   ✅ Saved: ${filename}`);

          // Mark attachment as processed
          markAsProcessed(attachmentHash, message.date);

          // Process with xAI if enabled
          let feedbackMessage = '';
          if (AUTO_PROCESS) {
            console.log(`   🤖 Processing with xAI...`);
            const result = await processImageWithXAI(dest);
            
            if (result.success && result.isReceipt) {
              feedbackMessage = '✅ Image processed';
            } else if (result.success && !result.isReceipt) {
              feedbackMessage = '⚠️ This does not appear to be a receipt';
            } else if (result.error === 'blurry') {
              feedbackMessage = '⚠️ Too blurry to process';
            } else {
              feedbackMessage = '⚠️ Unreadable';
            }
          } else {
            feedbackMessage = '✅ Got receipt';
          }

          // Send feedback to user
          try {
            if (message.sender && !message.isFromMe) {
              await sdk.send(message.sender, feedbackMessage);
              console.log(`   📤 Sent feedback: "${feedbackMessage}"`);
            }
          } catch (sendError) {
            console.error('   ⚠️  Could not send feedback:', sendError);
          }

        } catch (fileError) {
          console.error(`   ❌ Error processing attachment:`, fileError);
        }
      }
    }
  }

  // Mark the message as processed
  markAsProcessed(messageHash, message.date);
}

/**
 * Watch mode - continuous monitoring for NEW messages only
 */
async function startWatchingMessages() {
  console.log('\n🚀 iMessage Receipt Watcher Starting...\n');
  console.log('Configuration:');
  console.log(`  Target Number: ${TARGET_NUMBER || 'ALL (any sender)'}`);
  console.log(`  Watch Mode: ${WATCH_MODE ? 'CONTINUOUS' : 'ONE-TIME'}`);
  console.log(`  Auto-Process: ${AUTO_PROCESS ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  Save Directory: ${SAVE_DIR}\n`);

  // Load existing history
  loadHistory();
  console.log(`📅 Only processing messages after: ${lastProcessedTimestamp.toISOString()}\n`);

  if (WATCH_MODE) {
    const sdk = new IMessageSDK({ 
      debug: false, // Reduce noise
      maxConcurrent: 5,
      scriptTimeout: 30000,
      watcher: {
        pollInterval: 2000,
        unreadOnly: true,        // Only NEW unread messages
        excludeOwnMessages: true
      }
    });

    console.log('👀 Watching for NEW unread messages...');
    console.log('💡 Send a receipt image via iMessage to test!\n');

    await sdk.startWatching({
      onNewMessage: async (message: Message) => {
        // Skip if already processed
        const messageHash = hashMessage(message);
        if (isProcessed(messageHash)) {
          return; // Silent skip
        }

        // Skip old messages
        if (message.date <= lastProcessedTimestamp) {
          return; // Silent skip
        }

        console.log(`\n📨 New message from ${message.sender}`);
        console.log(`   Date: ${message.date.toISOString()}`);
        console.log(`   Text: ${message.text ? `"${message.text}"` : '(none)'}`);
        console.log(`   Attachments: ${message.attachments?.length || 0}`);
        
        // Filter by target number if specified
        if (TARGET_NUMBER) {
          const normalizedTarget = normalizePhoneNumber(TARGET_NUMBER);
          const normalizedSender = normalizePhoneNumber(message.sender);
          
          if (normalizedSender !== normalizedTarget) {
            console.log(`⏭️  Skipping (not from target)\n`);
            return;
          }
        }

        // Process the NEW message
        await processNewMessage(sdk, message);
        console.log(`✅ Message processed\n`);
      },
      
      onGroupMessage: async (message: Message) => {
        // Skip group messages
        return;
      },
      
      onError: (error: Error) => {
        console.error('\n❌ Watcher error:', error.message);
      }
    });

    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down...');
      sdk.stopWatching();
      await sdk.close();
      saveHistory();
      console.log('✅ Stopped. History saved.');
      process.exit(0);
    });

  } else {
    // One-time mode - process recent unread messages
    const sdk = new IMessageSDK({ debug: true });

    try {
      const filter: any = {
        unreadOnly: true,
        limit: 50
      };

      if (TARGET_NUMBER) {
        filter.sender = normalizePhoneNumber(TARGET_NUMBER);
      }

      const result = await sdk.getMessages(filter);
      const msgs: Message[] = (result && typeof result === 'object' && 'messages' in result)
        ? (result as any).messages || []
        : Array.isArray(result)
        ? result
        : [];

      if (!msgs || msgs.length === 0) {
        console.log('No unread messages found\n');
        await sdk.close();
        return;
      }

      console.log(`Found ${msgs.length} unread message(s)\n`);

      // Only process NEW messages (after last processed timestamp)
      const newMessages = msgs.filter(msg => msg.date > lastProcessedTimestamp);
      console.log(`Processing ${newMessages.length} NEW message(s)...\n`);

      for (const msg of newMessages) {
        await processNewMessage(sdk, msg);
      }

      console.log(`\n✅ Done!`);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      await sdk.close();
    }
  }
}

// Start based on mode
if (WATCH_MODE) {
  startWatchingMessages().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
} else {
  startWatchingMessages().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
