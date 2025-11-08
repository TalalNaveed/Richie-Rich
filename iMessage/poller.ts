import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGE_EXTRACT_SCRIPT = path.resolve(__dirname, 'imageExtract.ts');
const POLL_INTERVAL = 2000; // 2 seconds

let isRunning = false;

/**
 * Run the image extract script
 */
async function runImageExtract(): Promise<void> {
  if (isRunning) {
    console.log('⏭️  Previous run still in progress, skipping...');
    return;
  }

  isRunning = true;
  
  try {
    console.log(`\n🔄 [${new Date().toLocaleTimeString()}] Running image extract...`);
    
    const { stdout, stderr } = await execPromise(`tsx "${IMAGE_EXTRACT_SCRIPT}"`, {
      timeout: 30000, // 30 second timeout
      cwd: __dirname
    });

    if (stdout) {
      console.log(stdout);
    }
    
    if (stderr && !stderr.includes('No messages found')) {
      console.error('⚠️  Errors:', stderr);
    }

  } catch (error: any) {
    // Ignore "No messages found" errors - that's expected
    if (error.message && !error.message.includes('No messages found')) {
      console.error(`❌ Error running script:`, error.message);
    }
  } finally {
    isRunning = false;
  }
}

/**
 * Main polling loop
 */
async function startPolling() {
  console.log('🚀 Starting iMessage Poller');
  console.log(`📁 Script: ${IMAGE_EXTRACT_SCRIPT}`);
  console.log(`⏱️  Poll interval: ${POLL_INTERVAL}ms (2 seconds)`);
  console.log('💡 Press Ctrl+C to stop\n');

  // Run immediately on start
  await runImageExtract();

  // Then run every 2 seconds
  setInterval(async () => {
    await runImageExtract();
  }, POLL_INTERVAL);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping poller...');
    process.exit(0);
  });
}

// Start polling
startPolling().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

