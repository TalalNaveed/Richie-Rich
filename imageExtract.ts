import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { IMessageSDK, Message } from '@photon-ai/imessage-kit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAVE_DIR = path.resolve(__dirname, 'saved-images');

// Normalize phone number (remove spaces, parentheses, dashes)
function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[\s\(\)\-]/g, '');
}

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

              // Optionally reply
              await sdk.send(normalizedNumber, {
                text: `Got your image: ${filename}!`
              });
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

// Example use
const targetNumber = '';
processAndSaveImages(targetNumber);

