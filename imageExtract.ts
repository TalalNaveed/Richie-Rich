import fs from 'fs';
import path from 'path';
import { IMessageSDK, Message } from '@photon-ai/imessage-kit';

const SAVE_DIR = path.resolve(__dirname, 'saved-images');

async function processAndSaveImages(fromNumber: string) {
  const sdk = new IMessageSDK({ debug: true });

  try {
    const msgs: Message[] = await sdk.getMessages({
      sender: fromNumber,
      unreadOnly: true,
      limit: 50
    });

    // Ensure local folder exists
    if (!fs.existsSync(SAVE_DIR)) {
      fs.mkdirSync(SAVE_DIR, { recursive: true });
    }

    for (const msg of msgs) {
      if (msg.attachments) {
        for (const att of msg.attachments) {
          if (att.mimeType?.startsWith('image/')) {
            const filename = path.basename(att.path);
            const dest = path.join(SAVE_DIR, filename);

            // Copy the file to your folder
            fs.copyFileSync(att.path, dest);
            console.log(`✅ Saved image to ${dest}`);

            // Optionally reply
            await sdk.send(fromNumber, {
              text: `Got your image: ${filename}!`
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('Error while saving images:', err);
  } finally {
    await sdk.close();
  }
}

// Example use
const targetNumber = '';
processAndSaveImages(targetNumber);

