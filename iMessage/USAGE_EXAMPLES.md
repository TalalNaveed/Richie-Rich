# 📱 iMessage Watcher - Usage Examples

## Message Types Handled

### 1. Text Only Message
```
User sends: "Hello, this is a test"
```

**What happens:**
```
📨 New message from +1234567890
   Text: "Hello, this is a test"
   Attachments: 0
   📝 Text message received: "Hello, this is a test"
   💡 TODO: Process with AI / pipe to your logic
✅ Text processed
```

### 2. Image Only Message (No Text)
```
User sends: [image file]
```

**What happens:**
```
📨 New message from +1234567890
   Text: (none)
   Attachments: 1
📸 Found image(s) - processing...
   Processing 1 attachment(s)...
   - Checking: IMG_1234.jpg
     Type: image/jpeg
     ✓ Is an image!
     ✅ Saved: receipt-1699388400000.jpg
     🤖 Auto-processing with xAI...
     ✨ Processing complete!
✅ Processed 1 new image(s)
```

### 3. Text + Image Message
```
User sends: "Here's my receipt" + [image file]
```

**What happens:**
```
📨 New message from +1234567890
   Text: "Here's my receipt"
   Attachments: 1
   📝 Text message received: "Here's my receipt"
   💡 TODO: Process with AI / pipe to your logic
📸 Found image(s) - processing...
   Processing 1 attachment(s)...
   - Checking: IMG_5678.jpg
     Type: image/jpeg
     ✓ Is an image!
     ✅ Saved: receipt-1699388401000.jpg
     🤖 Auto-processing with xAI...
     ✨ Processing complete!
✅ Processed 1 new image(s)
```

## Where to Add Your Logic

### Text Processing
Edit `iMessage/imageExtract.ts` and find the `processTextMessage` function:

```typescript
/**
 * Dummy function for text processing - replace with your AI logic later
 */
async function processTextMessage(text: string, sender: string): Promise<void> {
  console.log(`   📝 Text message received: "${text}"`);
  console.log(`   💡 TODO: Process with AI / pipe to your logic`);
  
  // TODO: Add your text processing logic here
  // Examples:
  
  // 1. Send to your AI service
  // const response = await yourAI.chat(text, sender);
  
  // 2. Parse commands
  // if (text.toLowerCase().includes('help')) {
  //   await sdk.send(sender, 'Help message here');
  // }
  
  // 3. Store in database
  // await db.messages.create({ text, sender, date: new Date() });
  
  // 4. Trigger webhook
  // await fetch('https://your-api.com/process', {
  //   method: 'POST',
  //   body: JSON.stringify({ text, sender })
  // });
}
```

### Image Processing
Images are automatically:
1. Saved to `iMessage/saved-images/`
2. Sent to xAI Grok for OCR (if AUTO_PROCESS=true)
3. Converted to JSON in `xAI/processed-receipts/`

No changes needed for image processing!

## Example Integrations

### Example 1: AI Chatbot
```typescript
async function processTextMessage(text: string, sender: string): Promise<void> {
  // Send to your AI
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: text }]
  });
  
  // Reply via iMessage
  await sdk.send(sender, response.choices[0].message.content);
}
```

### Example 2: Command Handler
```typescript
async function processTextMessage(text: string, sender: string): Promise<void> {
  const command = text.toLowerCase().trim();
  
  if (command === 'balance') {
    const balance = await getBalance(sender);
    await sdk.send(sender, `Your balance: $${balance}`);
  }
  else if (command.startsWith('send ')) {
    // Handle send command
  }
}
```

### Example 3: Log to Database
```typescript
async function processTextMessage(text: string, sender: string): Promise<void> {
  await prisma.message.create({
    data: {
      text: text,
      sender: sender,
      timestamp: new Date(),
      type: 'text'
    }
  });
}
```

## Testing Different Message Types

### Test 1: Text Only
```bash
# Start watcher
npm run imessage:watch

# Send text message via iMessage: "Hello test"
# Expected: Text processed, no image processing
```

### Test 2: Image Only  
```bash
# Start watcher
npm run imessage:watch

# Send image via iMessage (no text)
# Expected: Image saved and processed, no text processing
```

### Test 3: Text + Image
```bash
# Start watcher
npm run imessage:watch

# Send message via iMessage: "My receipt" + [image]
# Expected: Both text AND image processed
```

## Current Behavior

| Message Type | Text Processing | Image Processing |
|--------------|----------------|------------------|
| Text only | ✅ Calls `processTextMessage()` | ❌ N/A |
| Image only | ❌ N/A | ✅ Saved + xAI processing |
| Text + Image | ✅ Calls `processTextMessage()` | ✅ Saved + xAI processing |
| Empty | ⏭️ Skipped | ⏭️ Skipped |

## Next Steps

1. **Replace the dummy function** in `processTextMessage()` with your logic
2. **Test with different message types** to verify behavior
3. **Keep images auto-processing** with xAI (already working)

---

**The text processing hook is ready for your AI integration!** 🚀
