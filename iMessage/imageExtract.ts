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
  console.log(`\n🤖 [DEBUG] Starting xAI processing:`);
  console.log(`   Image path: ${imagePath}`);
  console.log(`   File exists: ${fs.existsSync(imagePath)}`);
  
  if (fs.existsSync(imagePath)) {
    const stats = fs.statSync(imagePath);
    console.log(`   File size: ${stats.size} bytes`);
  }
  
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execPromise = promisify(exec);
    
    const xaiDir = path.resolve(__dirname, '../xAI');
    const filename = path.basename(imagePath);
    
    console.log(`   xAI directory: ${xaiDir}`);
    console.log(`   Filename: ${filename}`);
    console.log(`   Command: cd "${xaiDir}" && npm run process:single "${filename}"`);
    
    // Call xAI processor
    const { stdout, stderr } = await execPromise(
      `cd "${xaiDir}" && npm run process:single "${filename}"`,
      { timeout: 60000 }
    );
    
    console.log(`📊 [DEBUG] xAI command executed`);
    console.log(`   stdout length: ${stdout?.length || 0}`);
    console.log(`   stderr length: ${stderr?.length || 0}`);
    if (stdout) console.log(`   stdout: ${stdout.substring(0, 200)}...`);
    if (stderr) console.log(`   stderr: ${stderr.substring(0, 200)}...`);
    
    // Check if JSON file was created
    const jsonPath = path.join(xaiDir, 'processed-receipts', `${path.parse(filename).name}.json`);
    console.log(`🔍 [DEBUG] Checking for JSON output:`);
    console.log(`   Expected path: ${jsonPath}`);
    console.log(`   JSON exists: ${fs.existsSync(jsonPath)}`);
    
    if (fs.existsSync(jsonPath)) {
      console.log(`✅ [DEBUG] JSON file found - reading...`);
      // Read the JSON to check result
      const receiptData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      console.log(`   JSON keys: ${Object.keys(receiptData).join(', ')}`);
      console.log(`   isReceipt field: ${receiptData.isReceipt}`);
      
      // Check if it's marked as not a receipt
      if (receiptData.isReceipt === false) {
        console.log(`⚠️  [DEBUG] Marked as not a receipt`);
        return { success: true, isReceipt: false };
      }
      
      // Check if it has receipt-like data
      const hasReceiptData = receiptData.merchantName && 
                            (receiptData.items?.length > 0 || receiptData.total);
      console.log(`   Has merchantName: ${!!receiptData.merchantName}`);
      console.log(`   Has items: ${!!(receiptData.items?.length > 0)}`);
      console.log(`   Has total: ${!!receiptData.total}`);
      console.log(`   Has receipt data: ${hasReceiptData}`);
      
      if (hasReceiptData) {
        console.log(`✅ [DEBUG] Valid receipt data found`);
        return { success: true, isReceipt: true };
      } else {
        console.log(`⚠️  [DEBUG] No valid receipt data`);
        return { success: true, isReceipt: false };
      }
    }
    
    console.log(`⚠️  [DEBUG] No JSON file created - checking output for errors...`);
    // Check stdout/stderr for error messages
    const output = (stdout + stderr).toLowerCase();
    console.log(`   Output contains 'not a receipt': ${output.includes('not a receipt')}`);
    console.log(`   Output contains 'blur': ${output.includes('blur')}`);
    console.log(`   Output contains 'unreadable': ${output.includes('unreadable')}`);
    
    if (output.includes('not a receipt') || output.includes('does not appear')) {
      return { success: true, isReceipt: false };
    }
    if (output.includes('blur') || output.includes('blurry')) {
      return { success: false, isReceipt: false, error: 'blurry' };
    }
    if (output.includes('unreadable') || output.includes('cannot read')) {
      return { success: false, isReceipt: false, error: 'unreadable' };
    }
    
    console.log(`❌ [DEBUG] Unknown error - defaulting to unreadable`);
    return { success: false, isReceipt: false, error: 'unreadable' };
    
  } catch (error: any) {
    console.error(`❌ [DEBUG] xAI processing error:`);
    console.error(`   Error type: ${error.constructor.name}`);
    console.error(`   Error message: ${error.message}`);
    if (error.stderr) console.error(`   stderr: ${error.stderr}`);
    if (error.stdout) console.error(`   stdout: ${error.stdout}`);
    if (error.stack) console.error(`   Stack: ${error.stack}`);
    
    // Check error message for clues
    const errorMsg = (error.message || error.stderr || '').toLowerCase();
    console.log(`   Error message contains 'blur': ${errorMsg.includes('blur')}`);
    console.log(`   Error message contains 'not a receipt': ${errorMsg.includes('not a receipt')}`);
    
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
  console.log(`\n🔍 [DEBUG] Processing message:`);
  console.log(`   ID: ${message.id}`);
  console.log(`   Sender: ${message.sender}`);
  console.log(`   Date: ${message.date.toISOString()}`);
  console.log(`   Text: ${message.text || '(none)'}`);
  console.log(`   Attachments count: ${message.attachments?.length || 0}`);
  console.log(`   IsFromMe: ${message.isFromMe}`);
  console.log(`   IsRead: ${message.isRead}`);
  
  const messageHash = hashMessage(message);
  console.log(`   Message hash: ${messageHash.substring(0, 16)}...`);
  
  // Skip if already processed
  if (isProcessed(messageHash)) {
    console.log(`⏭️  [DEBUG] Message already processed (hash exists)`);
    return; // Silent skip - already processed
  }
  console.log(`✅ [DEBUG] Message hash not found - proceeding`);

  // Only process messages newer than last processed timestamp
  console.log(`🔍 [DEBUG] Comparing timestamps:`);
  console.log(`   Message date: ${message.date.toISOString()}`);
  console.log(`   Last processed: ${lastProcessedTimestamp.toISOString()}`);
  console.log(`   Is newer: ${message.date > lastProcessedTimestamp}`);
  
  if (message.date <= lastProcessedTimestamp) {
    console.log(`⏭️  [DEBUG] Skipping old message (before ${lastProcessedTimestamp.toISOString()})`);
    return;
  }
  console.log(`✅ [DEBUG] Message is NEW - continuing`);

  // Process text if present
  if (message.text && message.text.trim().length > 0) {
    console.log(`📝 [DEBUG] Processing text message...`);
    await processTextMessage(message.text, message.sender);
  } else {
    console.log(`ℹ️  [DEBUG] No text in message`);
  }

  // Process images
  console.log(`🔍 [DEBUG] Checking attachments...`);
  if (message.attachments && message.attachments.length > 0) {
    console.log(`   Found ${message.attachments.length} attachment(s)`);
    
    // Log each attachment
    message.attachments.forEach((att, idx) => {
      console.log(`   [${idx}] Path: ${att.path}`);
      console.log(`       MIME: ${att.mimeType || 'unknown'}`);
      console.log(`       Exists: ${fs.existsSync(att.path)}`);
    });
    
    const imageAttachments = message.attachments.filter(att => {
      const isImage = att.mimeType?.startsWith('image/');
      console.log(`   Checking: ${path.basename(att.path)} - MIME: ${att.mimeType} - IsImage: ${isImage}`);
      return isImage;
    });
    
    console.log(`   Filtered to ${imageAttachments.length} image attachment(s)`);
    
    if (imageAttachments.length > 0) {
      // Ensure save directory exists
      if (!fs.existsSync(SAVE_DIR)) {
        console.log(`📁 [DEBUG] Creating save directory: ${SAVE_DIR}`);
        fs.mkdirSync(SAVE_DIR, { recursive: true });
      } else {
        console.log(`✅ [DEBUG] Save directory exists: ${SAVE_DIR}`);
      }

      for (const att of imageAttachments) {
        console.log(`\n🖼️  [DEBUG] Processing image attachment:`);
        console.log(`   Path: ${att.path}`);
        console.log(`   Basename: ${path.basename(att.path)}`);
        console.log(`   MIME: ${att.mimeType}`);
        
        const attachmentHash = hashAttachment(att.path, message.id);
        console.log(`   Attachment hash: ${attachmentHash.substring(0, 16)}...`);
        
        // Skip if already processed
        if (isProcessed(attachmentHash)) {
          console.log(`⏭️  [DEBUG] Attachment already processed (hash exists)`);
          continue;
        }
        console.log(`✅ [DEBUG] Attachment hash not found - proceeding`);

        try {
          // Verify file exists
          if (!fs.existsSync(att.path)) {
            console.log(`❌ [DEBUG] File not found: ${att.path}`);
            console.log(`   Attempting to list directory: ${path.dirname(att.path)}`);
            try {
              const dirContents = fs.readdirSync(path.dirname(att.path));
              console.log(`   Directory contents: ${dirContents.slice(0, 5).join(', ')}...`);
            } catch (dirError) {
              console.log(`   Cannot read directory: ${dirError}`);
            }
            continue;
          }
          console.log(`✅ [DEBUG] File exists`);

          const timestamp = Date.now();
          const ext = path.extname(att.path);
          const filename = `receipt-${timestamp}${ext}`;
          const dest = path.join(SAVE_DIR, filename);
          
          console.log(`💾 [DEBUG] Copying file:`);
          console.log(`   From: ${att.path}`);
          console.log(`   To: ${dest}`);

          // Copy the file
          fs.copyFileSync(att.path, dest);
          console.log(`✅ [DEBUG] File copied successfully`);

          // Verify copy
          if (fs.existsSync(dest)) {
            const stats = fs.statSync(dest);
            console.log(`✅ [DEBUG] Copy verified - size: ${stats.size} bytes`);
          } else {
            console.log(`❌ [DEBUG] Copy verification failed - file not found at destination`);
            continue;
          }

          // Mark attachment as processed
          markAsProcessed(attachmentHash, message.date);
          console.log(`✅ [DEBUG] Marked attachment as processed`);

          // Process with xAI if enabled
          let feedbackMessage = '';
          if (AUTO_PROCESS) {
            console.log(`🤖 [DEBUG] AUTO_PROCESS enabled - calling xAI...`);
            const result = await processImageWithXAI(dest);
            console.log(`📊 [DEBUG] xAI result:`, result);
            
            if (result.success && result.isReceipt) {
              feedbackMessage = '✅ Image processed';
              console.log(`✅ [DEBUG] Success - receipt processed`);
            } else if (result.success && !result.isReceipt) {
              feedbackMessage = '⚠️ This does not appear to be a receipt';
              console.log(`⚠️  [DEBUG] Not a receipt`);
            } else if (result.error === 'blurry') {
              feedbackMessage = '⚠️ Too blurry to process';
              console.log(`⚠️  [DEBUG] Image too blurry`);
            } else {
              feedbackMessage = '⚠️ Unreadable';
              console.log(`⚠️  [DEBUG] Image unreadable`);
            }
          } else {
            feedbackMessage = '✅ Got receipt';
            console.log(`ℹ️  [DEBUG] AUTO_PROCESS disabled - using default message`);
          }

          // Send feedback to user
          console.log(`📤 [DEBUG] Sending feedback: "${feedbackMessage}"`);
          try {
            if (message.sender && !message.isFromMe) {
              await sdk.send(message.sender, feedbackMessage);
              console.log(`✅ [DEBUG] Feedback sent successfully`);
            } else {
              console.log(`⏭️  [DEBUG] Skipping feedback (from me or no sender)`);
            }
          } catch (sendError) {
            console.error(`❌ [DEBUG] Could not send feedback:`, sendError);
            if (sendError instanceof Error) {
              console.error(`   Error message: ${sendError.message}`);
              console.error(`   Stack: ${sendError.stack}`);
            }
          }

        } catch (fileError) {
          console.error(`❌ [DEBUG] Error processing attachment:`);
          console.error(`   Error:`, fileError);
          if (fileError instanceof Error) {
            console.error(`   Message: ${fileError.message}`);
            console.error(`   Stack: ${fileError.stack}`);
          }
        }
      }
    } else {
      console.log(`ℹ️  [DEBUG] No image attachments found (filtered out)`);
    }
  } else {
    console.log(`ℹ️  [DEBUG] No attachments in message`);
  }

  // Mark the message as processed
  markAsProcessed(messageHash, message.date);
  console.log(`✅ [DEBUG] Marked message as processed`);
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
      debug: true, // Enable SDK debug logging
      maxConcurrent: 5,
      scriptTimeout: 30000,
      watcher: {
        pollInterval: 2000,
        unreadOnly: true,        // Only NEW unread messages
        excludeOwnMessages: true
      }
    });

    console.log('👀 Watching for NEW unread messages...');
    console.log('💡 Send a receipt image via iMessage to test!');
    console.log(`📅 Only processing messages after: ${lastProcessedTimestamp.toISOString()}\n`);

    await sdk.startWatching({
      onNewMessage: async (message: Message) => {
        console.log(`\n🔔 [DEBUG] onNewMessage callback triggered`);
        console.log(`   Sender: ${message.sender}`);
        console.log(`   Date: ${message.date.toISOString()}`);
        console.log(`   Text: ${message.text ? `"${message.text}"` : '(none)'}`);
        console.log(`   Attachments: ${message.attachments?.length || 0}`);
        console.log(`   IsFromMe: ${message.isFromMe}`);
        console.log(`   IsRead: ${message.isRead}`);
        
        // Skip if already processed
        const messageHash = hashMessage(message);
        console.log(`🔍 [DEBUG] Checking if message already processed...`);
        if (isProcessed(messageHash)) {
          console.log(`⏭️  [DEBUG] Message already processed - skipping`);
          return; // Silent skip
        }
        console.log(`✅ [DEBUG] Message not processed yet`);

        // Skip old messages
        console.log(`🔍 [DEBUG] Checking message timestamp...`);
        if (message.date <= lastProcessedTimestamp) {
          console.log(`⏭️  [DEBUG] Message is old (${message.date.toISOString()} <= ${lastProcessedTimestamp.toISOString()}) - skipping`);
          return; // Silent skip
        }
        console.log(`✅ [DEBUG] Message is NEW`);

        // Filter by target number if specified
        if (TARGET_NUMBER) {
          const normalizedTarget = normalizePhoneNumber(TARGET_NUMBER);
          const normalizedSender = normalizePhoneNumber(message.sender);
          console.log(`🔍 [DEBUG] Checking target number filter:`);
          console.log(`   Target: ${normalizedTarget}`);
          console.log(`   Sender: ${normalizedSender}`);
          console.log(`   Match: ${normalizedSender === normalizedTarget}`);
          
          if (normalizedSender !== normalizedTarget) {
            console.log(`⏭️  [DEBUG] Sender doesn't match target - skipping\n`);
            return;
          }
        } else {
          console.log(`✅ [DEBUG] No target number filter - accepting all`);
        }

        // Process the NEW message
        console.log(`🚀 [DEBUG] Starting to process message...`);
        await processNewMessage(sdk, message);
        console.log(`✅ [DEBUG] Message processing complete\n`);
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
