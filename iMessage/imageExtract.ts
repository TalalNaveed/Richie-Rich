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
 * Dummy function for text processing - replace with your AI logic later
 */
async function processTextMessage(text: string, sender: string): Promise<void> {
  console.log(`   📝 Text message received: "${text}"`);
  console.log(`   💡 TODO: Process with AI / pipe to your logic`);
  // TODO: Add your text processing logic here
  // Example: await yourAIFunction(text, sender);
}

/**
 * Process messages and save images - based on original working code
 */
async function processAndSaveImages(fromNumber: string) {
  const sdk = new IMessageSDK({ debug: true });

  try {
    // Normalize the phone number to match database format
    const normalizedNumber = normalizePhoneNumber(fromNumber);
    console.log(`Looking for messages from: ${normalizedNumber}`);

    const result = await sdk.getMessages({
      sender: normalizedNumber,
      unreadOnly: false,
      limit: 50
    });

    // Extract messages array from the response object
    // The API returns { messages: [], total: number, unreadCount: number }
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

    for (const msg of msgs) {
      // Process text if present
      if (msg.text && msg.text.trim().length > 0) {
        await processTextMessage(msg.text, msg.sender);
      }

      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.mimeType?.startsWith('image/')) {
            // Check for duplicates
            const attachmentHash = hashAttachment(att.path, msg.id);
            if (isProcessed(attachmentHash)) {
              console.log(`⏭️  Skipping duplicate: ${path.basename(att.path)}`);
              continue;
            }

            try {
              const filename = path.basename(att.path);
              const dest = path.join(SAVE_DIR, filename);

              // Copy the file to your folder (like original)
              fs.copyFileSync(att.path, dest);
              console.log(`✅ Saved image to ${dest}`);
              imageCount++;

              // Mark as processed
              markAsProcessed(attachmentHash);

              // Auto-process with xAI if enabled
              if (AUTO_PROCESS) {
                console.log(`   🤖 Auto-processing with xAI...`);
                try {
                  const { exec } = await import('child_process');
                  const { promisify } = await import('util');
                  const execPromise = promisify(exec);
                  
                  const xaiDir = path.resolve(__dirname, '../xAI');
                  await execPromise(`cd "${xaiDir}" && npm run process`, { timeout: 60000 });
                  console.log(`   ✨ Processing complete!`);
                } catch (processError) {
                  console.error(`   ⚠️  Auto-process failed:`, processError);
                }
              }

              // Optionally reply (like original)
              try {
                await sdk.send(normalizedNumber, {
                  text: `Got your image: ${filename}!`
                });
              } catch (sendError) {
                // Ignore send errors
              }

            } catch (fileError) {
              console.error(`Error processing attachment ${att.path}:`, fileError);
            }
          }
        }
      }
    }

    if (imageCount === 0) {
      console.log('No images found in the messages');
    } else {
      console.log(`✅ Successfully processed ${imageCount} image(s)`);
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

/**
 * Watch mode - continuous monitoring
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
    const sdk = new IMessageSDK({ 
      debug: true,
      maxConcurrent: 5,
      scriptTimeout: 30000,
      watcher: {
        pollInterval: 2000,
        unreadOnly: true,
        excludeOwnMessages: true
      }
    });

    console.log('👀 Watching for UNREAD messages...');
    console.log('💡 Send a receipt image via iMessage to test!\n');

    await sdk.startWatching({
      onNewMessage: async (message: Message) => {
        console.log(`\n📨 New message from ${message.sender}`);
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

        // Process text if present
        if (message.text && message.text.trim().length > 0) {
          await processTextMessage(message.text, message.sender);
        }

        // Process images
        if (message.attachments && message.attachments.length > 0) {
          const hasImages = message.attachments.some(att => att.mimeType?.startsWith('image/'));
          if (hasImages) {
            // Use the working processAndSaveImages function
            const normalizedSender = normalizePhoneNumber(message.sender);
            await processAndSaveImages(normalizedSender);
          }
        }
      },
      
      onGroupMessage: async (message: Message) => {
        console.log(`\n👥 Group message from ${message.sender}`);
        console.log(`⏭️  Skipping group messages\n`);
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
    // One-time mode - use the original working function
    if (TARGET_NUMBER) {
      await processAndSaveImages(TARGET_NUMBER);
    } else {
      console.log('⚠️  TARGET_NUMBER not set. Set IMESSAGE_TARGET_NUMBER in .env or pass as argument.');
      console.log('   Using empty string to process all messages...');
      await processAndSaveImages('');
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
  // One-time processing
  const targetNumber = TARGET_NUMBER || '';
  processAndSaveImages(targetNumber).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
