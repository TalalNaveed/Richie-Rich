/**
 * Test script to verify receipt processor setup and functionality
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const IMAGES_DIR = path.resolve(__dirname, '../iMessage/saved-images');
const OUTPUT_DIR = path.resolve(__dirname, 'processed-receipts');

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

const results: TestResult[] = [];

function addResult(test: string, status: 'PASS' | 'FAIL' | 'WARN', message: string) {
  results.push({ test, status, message });
}

function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS');
  console.log('='.repeat(60) + '\n');

  let passed = 0;
  let failed = 0;
  let warnings = 0;

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${result.test}`);
    console.log(`   ${result.message}\n`);

    if (result.status === 'PASS') passed++;
    else if (result.status === 'FAIL') failed++;
    else warnings++;
  });

  console.log('='.repeat(60));
  console.log(`Summary: ${passed} passed, ${failed} failed, ${warnings} warnings`);
  console.log('='.repeat(60) + '\n');

  return failed === 0;
}

async function runTests() {
  console.log('🧪 Running Receipt Processor Tests\n');

  // Test 1: Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion >= 18) {
    addResult('Node.js Version', 'PASS', `Using Node.js ${nodeVersion}`);
  } else {
    addResult('Node.js Version', 'WARN', `Node.js ${nodeVersion} (v18+ recommended)`);
  }

  // Test 2: Check xAI API key
  const apiKey = process.env.XAI_API_KEY;
  if (apiKey && apiKey.length > 20) {
    addResult('xAI API Key', 'PASS', 'API key is configured');
  } else if (apiKey) {
    addResult('xAI API Key', 'FAIL', 'API key format appears invalid');
  } else {
    addResult('xAI API Key', 'FAIL', 'API key not found in environment');
  }

  // Test 3: Check xAI API connection
  if (apiKey) {
    try {
      const xaiApiUrl = process.env.XAI_API_URL || 'https://api.x.ai/v1';
      const response = await fetch(`${xaiApiUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      if (response.ok) {
        addResult('xAI API Connection', 'PASS', 'Successfully connected to xAI Grok API');
      } else {
        addResult('xAI API Connection', 'FAIL', `API returned status ${response.status}`);
      }
    } catch (error) {
      addResult('xAI API Connection', 'FAIL', `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    addResult('xAI API Connection', 'FAIL', 'Skipped - no API key');
  }

  // Test 4: Check images directory exists
  if (fs.existsSync(IMAGES_DIR)) {
    const files = fs.readdirSync(IMAGES_DIR);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
    
    if (imageFiles.length > 0) {
      addResult('Images Directory', 'PASS', `Found ${imageFiles.length} image(s) in ${IMAGES_DIR}`);
    } else {
      addResult('Images Directory', 'WARN', `Directory exists but no images found in ${IMAGES_DIR}`);
    }
  } else {
    addResult('Images Directory', 'WARN', `Directory does not exist: ${IMAGES_DIR}`);
  }

  // Test 5: Check output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    const files = fs.readdirSync(OUTPUT_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    if (jsonFiles.length > 0) {
      addResult('Output Directory', 'PASS', `Found ${jsonFiles.length} processed receipt(s)`);
    } else {
      addResult('Output Directory', 'PASS', `Directory exists but no receipts processed yet`);
    }
  } else {
    addResult('Output Directory', 'WARN', 'Output directory will be created on first run');
  }

  // Test 6: Check TypeScript configuration
  const tsconfigPath = path.join(__dirname, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    addResult('TypeScript Config', 'PASS', 'tsconfig.json exists');
  } else {
    addResult('TypeScript Config', 'WARN', 'tsconfig.json not found');
  }

  // Test 7: Check dependencies
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const requiredDeps = ['dotenv']; // Only dotenv needed now (using native fetch for xAI)
    const missingDeps = requiredDeps.filter(dep => !pkg.dependencies?.[dep]);
    
    if (missingDeps.length === 0) {
      addResult('Dependencies', 'PASS', 'All required dependencies present');
    } else {
      addResult('Dependencies', 'FAIL', `Missing dependencies: ${missingDeps.join(', ')}`);
    }
  } else {
    addResult('Dependencies', 'FAIL', 'package.json not found');
  }

  // Test 8: Check .env file
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    addResult('Environment File', 'PASS', '.env file exists');
  } else {
    const envExamplePath = path.join(__dirname, '.env.example');
    if (fs.existsSync(envExamplePath)) {
      addResult('Environment File', 'WARN', '.env not found, but .env.example exists');
    } else {
      addResult('Environment File', 'FAIL', 'Neither .env nor .env.example found');
    }
  }

  // Test 9: Validate existing receipts (if any)
  const allReceiptsPath = path.join(OUTPUT_DIR, 'all-receipts.json');
  if (fs.existsSync(allReceiptsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(allReceiptsPath, 'utf-8'));
      const validReceipts = data.filter((r: any) => r.data !== null);
      const totalReceipts = data.length;
      const successRate = totalReceipts > 0 ? (validReceipts.length / totalReceipts * 100).toFixed(1) : 0;
      
      addResult('Receipt Validation', 'PASS', `${validReceipts.length}/${totalReceipts} receipts valid (${successRate}% success rate)`);
    } catch (error) {
      addResult('Receipt Validation', 'FAIL', 'Failed to parse all-receipts.json');
    }
  } else {
    addResult('Receipt Validation', 'WARN', 'No processed receipts to validate yet');
  }

  // Test 10: Check file permissions
  try {
    const testFile = path.join(__dirname, '.test-permissions');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    addResult('File Permissions', 'PASS', 'Read/write permissions OK');
  } catch (error) {
    addResult('File Permissions', 'FAIL', 'Cannot write to directory');
  }

  // Print all results
  const allTestsPassed = printResults();

  // Provide recommendations
  console.log('📋 RECOMMENDATIONS:\n');
  
  if (!apiKey) {
    console.log('⚠️  Set your xAI API key in .env file:');
    console.log('   XAI_API_KEY=your-xai-key-here\n');
  }

  if (!fs.existsSync(IMAGES_DIR)) {
    console.log('⚠️  Create images directory:');
    console.log(`   mkdir -p "${IMAGES_DIR}"\n`);
  } else {
    const files = fs.readdirSync(IMAGES_DIR);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
    
    if (imageFiles.length === 0) {
      console.log('⚠️  Add receipt images to:');
      console.log(`   ${IMAGES_DIR}\n`);
    }
  }

  if (allTestsPassed && apiKey) {
    console.log('✅ All critical tests passed! Ready to process receipts.');
    console.log('\n💡 Run: npm run process\n');
  } else {
    console.log('⚠️  Some tests failed. Fix the issues above before processing receipts.\n');
  }
}

// Run tests
console.log('\n');
runTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });



