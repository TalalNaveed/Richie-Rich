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
      console.log(`📋 Loaded history: ${history.processedHashes.size} processed messages`);
    }
  } catch (error) {
    console.error('⚠️  Error loading history:', error);
    history = {
      processedHashes: new Set<string>(),
      lastProcessed: new Date().toISOString()
    };
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
function markAsProcessed(hash: string): void {
  history.processedHashes.add(hash);
  history.lastProcessed = new Date().toISOString();
  saveHistory();
}

/**
 * Normalize phone number (remove spaces, parentheses, dashes)
 */
function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[\s\(\)\-]/g, '');
}

/**
 * Process and save images from a message
 */
async function processMessage(sdk: IMessageSDK, message: Message): Promise<number> {
  const messageHash = hashMessage(message);
  
  // Skip if already processed
  if (isProcessed(messageHash)) {
    console.log(`⏭️  Message already processed (duplicate)`);
    return 0;
  }

  // Ensure save directory exists
  if (!fs.existsSync(SAVE_DIR)) {
    fs.mkdirSync(SAVE_DIR, { recursive: true });
  }

  let imageCount = 0;

  if (message.attachments && message.attachments.length > 0) {
    console.log(`   Processing ${message.attachments.length} attachment(s)...`);
    
    for (const att of message.attachments) {
      console.log(`   - Checking: ${path.basename(att.path)}`);
      console.log(`     Type: ${att.mimeType || 'unknown'}`);
      
      if (att.mimeType?.startsWith('image/')) {
        console.log(`     ✓ Is an image!`);
        
        const attachmentHash = hashAttachment(att.path, message.id);
        
        // Skip if this specific attachment was already processed
        if (isProcessed(attachmentHash)) {
          console.log(`     ⏭️  Already processed`);
          continue;
        }

        try {
          // Verify file exists
          if (!fs.existsSync(att.path)) {
            console.log(`     ❌ File not found: ${att.path}`);
            continue;
          }

          const timestamp = Date.now();
          const ext = path.extname(att.path);
          const filename = `receipt-${timestamp}${ext}`;
          const dest = path.join(SAVE_DIR, filename);

          // Copy the file
          fs.copyFileSync(att.path, dest);
          console.log(`     ✅ Saved: ${filename}`);
          imageCount++;

          // Mark as processed
          markAsProcessed(attachmentHash);

          // Auto-process with xAI if enabled
          if (AUTO_PROCESS) {
            console.log(`     🤖 Auto-processing with xAI...`);
            try {
              const { exec } = await import('child_process');
              const { promisify } = await import('util');
              const execPromise = promisify(exec);
              
              const xaiDir = path.resolve(__dirname, '../xAI');
              await execPromise(`cd "${xaiDir}" && npm run process`, { timeout: 60000 });
              console.log(`     ✨ Processing complete!`);
            } catch (processError) {
              console.error(`     ⚠️  Auto-process failed:`, processError);
            }
          }

          // Send acknowledgment
          try {
            if (message.sender && !message.isFromMe) {
              await sdk.send(message.sender, `📸 Got your receipt! ${AUTO_PROCESS ? 'Processing...' : 'Saved!'}`);
              console.log(`     📤 Sent acknowledgment`);
            }
          } catch (sendError) {
            console.error('     ⚠️  Could not send acknowledgment:', sendError);
          }

        } catch (fileError) {
          console.error(`     ❌ Error:`, fileError);
        }
      } else {
        console.log(`     ✗ Not an image`);
      }
    }
  }

  // Mark the message as processed
  markAsProcessed(messageHash);
  
  return imageCount;
}

/**
 * Main function - continuous watching mode
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

  if (WATCH_MODE) {
    // Initialize SDK with watcher configuration
    const sdk = new IMessageSDK({ 
      debug: true,
      maxConcurrent: 5,
      scriptTimeout: 30000,
      watcher: {
        pollInterval: 2000,           // Check every 2 seconds
        unreadOnly: true,             // Only watch UNREAD messages
        excludeOwnMessages: true      // Exclude messages from yourself
      }
    });

    console.log('👀 Watching for UNREAD messages with images...');
    console.log('💡 Send a receipt image via iMessage to test!\n');

    // Start watching with event handlers
    await sdk.startWatching({
      onNewMessage: async (message: Message) => {
        console.log(`\n📨 New message from ${message.sender}`);
        console.log(`   Date: ${message.date.toISOString()}`);
        console.log(`   Read: ${message.isRead ? 'YES' : 'NO'}`);
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

        // Check for image attachments
        const hasImages = message.attachments?.some(att => att.mimeType?.startsWith('image/'));
        if (!hasImages) {
          console.log(`ℹ️  No images in message\n`);
          return;
        }

        console.log(`📸 Found image(s) - processing...`);
        
        // Process the message
        const imageCount = await processMessage(sdk, message);
        
        if (imageCount > 0) {
          console.log(`\n✅ Processed ${imageCount} new image(s)\n`);
        } else {
          console.log(`\nℹ️  No new images (duplicates skipped)\n`);
        }
      },
      
      onGroupMessage: async (message: Message) => {
        console.log(`\n👥 Group message from ${message.sender}`);
        console.log(`⏭️  Skipping group messages\n`);
      },
      
      onError: (error: Error) => {
        console.error('\n❌ Watcher error:', error.message);
        console.error('Stack:', error.stack);
      }
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down...');
      sdk.stopWatching();
      await sdk.close();
      saveHistory();
      console.log('✅ Stopped. History saved.');
      process.exit(0);
    });

    // Keep process alive
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
    });

    process.on('unhandledRejection', (error) => {
      console.error('Unhandled rejection:', error);
    });

  } else {
    // One-time mode: fetch recent UNREAD messages
    console.log('📥 Fetching recent UNREAD messages (one-time)...\n');

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

      let totalImages = 0;
      for (const msg of msgs) {
        console.log(`\nProcessing message from ${msg.sender}...`);
        const imageCount = await processMessage(sdk, msg);
        totalImages += imageCount;
      }

      if (totalImages === 0) {
        console.log('\nℹ️  No new images found');
      } else {
        console.log(`\n✅ Processed ${totalImages} new image(s)`);
      }

    } catch (err) {
      console.error('Error:', err);
      if (err instanceof Error) {
        console.error('Details:', err.message);
        console.error('Stack:', err.stack);
      }
    } finally {
      await sdk.close();
      console.log('\n✅ Done!');
    }
  }
}

// Start the watcher
console.log('Starting iMessage watcher...\n');
startWatchingMessages().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
