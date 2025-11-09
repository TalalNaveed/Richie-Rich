#!/usr/bin/env node

/**
 * listen.js - Node.js version of the listener script
 * Polls the API endpoint every second to check for new receipts from Mac
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const NGROK_URL = 'https://bustlingly-cytological-concetta.ngrok-free.dev';
const API_ENDPOINT = `${NGROK_URL}/api/imessage-receive`;
const PROCESSED_FILE = path.join(process.cwd(), 'xAI/processed-receipts/.processed-imessage-receipts.json');
const POLL_INTERVAL = 1000; // 1 second

// Ensure processed receipts directory exists
const processedDir = path.dirname(PROCESSED_FILE);
if (!fs.existsSync(processedDir)) {
  fs.mkdirSync(processedDir, { recursive: true });
}

// Load processed receipts
function loadProcessedReceipts() {
  try {
    if (fs.existsSync(PROCESSED_FILE)) {
      const data = fs.readFileSync(PROCESSED_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading processed receipts:', error.message);
  }
  return [];
}

// Save processed receipts
function saveProcessedReceipts(processed) {
  try {
    fs.writeFileSync(PROCESSED_FILE, JSON.stringify(processed, null, 2));
  } catch (error) {
    console.error('Error saving processed receipts:', error.message);
  }
}

// Check if receipt was already processed
function isProcessed(timestamp, processedReceipts) {
  return processedReceipts.some(r => r.timestamp === timestamp);
}

// Mark receipt as processed
function markProcessed(timestamp, orderName, transactionId, processedReceipts) {
  processedReceipts.push({
    timestamp,
    orderName,
    transactionId,
    processedAt: new Date().toISOString()
  });
  saveProcessedReceipts(processedReceipts);
}

// Make HTTP request
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: data
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Process new receipt
function processReceipt(timestamp, orderName, transactionId) {
  console.log('✅ Processing new receipt:');
  console.log(`   📦 Order: ${orderName}`);
  console.log(`   🆔 Transaction ID: ${transactionId}`);
  console.log(`   ⏰ Timestamp: ${timestamp}`);
  console.log('   ✅ Receipt processed and saved!');
  console.log('');
}

// Main polling function
async function pollForReceipts() {
  const processedReceipts = loadProcessedReceipts();
  
  try {
    // Check for new receipts via API
    const response = await makeRequest(`${API_ENDPOINT}?check=true`);
    
    if (response.statusCode === 200 && response.data.hasNewReceipt) {
      const receipt = response.data.receipt;
      const timestamp = receipt.timestamp;
      const orderName = receipt.orderName;
      const transactionId = response.data.transactionId;
      
      if (!isProcessed(timestamp, processedReceipts)) {
        processReceipt(timestamp, orderName, transactionId);
        markProcessed(timestamp, orderName, transactionId, processedReceipts);
        
        // Also trigger frontend refresh via custom event
        // (This would need to be done from the frontend, but we log it here)
        console.log('   🔄 Frontend will be notified on next poll');
      } else {
        console.log(`⏭️  Receipt ${timestamp} already processed, skipping...`);
      }
    }
  } catch (error) {
    // Silently handle errors - endpoint might not be available yet
    if (error.code !== 'ECONNREFUSED' && error.code !== 'ENOTFOUND') {
      console.error('Error polling:', error.message);
    }
  }
}

// Main loop
console.log('🚀 Starting iMessage JSON listener...');
console.log(`📡 Polling endpoint: ${API_ENDPOINT}`);
console.log(`⏱️  Checking every ${POLL_INTERVAL / 1000} second(s)`);
console.log('');
console.log('✅ Listener is ready! Press Ctrl+C to stop');
console.log('');

// Start polling immediately, then every second
pollForReceipts();
setInterval(pollForReceipts, POLL_INTERVAL);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down listener...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down listener...');
  process.exit(0);
});

