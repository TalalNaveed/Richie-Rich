import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { IMessageSDK, Message } from '@photon-ai/imessage-kit';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SAVE_DIR = path.resolve(__dirname, 'saved-images');

// Configuration from environment
const TARGET_NUMBER = process.env.IMESSAGE_TARGET_NUMBER || '';
const AUTO_PROCESS = process.env.IMESSAGE_AUTO_PROCESS === 'true';

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
 * Process messages and save images - original working code
 */
async function processAndSaveImages(fromNumber: string) {
  const sdk = new IMessageSDK({ debug: true });

  try {
    // Normalize the phone number to match database format
    const normalizedNumber = normalizePhoneNumber(fromNumber);
    console.log(`Looking for messages from: ${normalizedNumber || 'ALL'}`);

    const result = await sdk.getMessages({
      sender: normalizedNumber || undefined,
      unreadOnly: false,
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

    for (const msg of msgs) {
      // Process text if present
      if (msg.text && msg.text.trim().length > 0) {
        await processTextMessage(msg.text, msg.sender);
      }

      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.mimeType?.startsWith('image/')) {
            try {
              const filename = path.basename(att.path);
              const dest = path.join(SAVE_DIR, filename);

              // Copy the file to your folder
              fs.copyFileSync(att.path, dest);
              console.log(`✅ Saved image to ${dest}`);
              imageCount++;

              // Auto-process with xAI if enabled
              if (AUTO_PROCESS) {
                console.log(`🤖 Auto-processing with xAI...`);
                try {
                  const { exec } = await import('child_process');
                  const { promisify } = await import('util');
                  const execPromise = promisify(exec);
                  
                  const xaiDir = path.resolve(__dirname, '../xAI');
                  await execPromise(`cd "${xaiDir}" && npm run process`, { timeout: 60000 });
                  console.log(`✨ Processing complete!`);
                } catch (processError) {
                  console.error(`⚠️  Auto-process failed:`, processError);
                }
              }

              // Optionally reply
              try {
                await sdk.send(normalizedNumber || msg.sender, {
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

// Run the processor
const targetNumber = TARGET_NUMBER || '';
processAndSaveImages(targetNumber).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
