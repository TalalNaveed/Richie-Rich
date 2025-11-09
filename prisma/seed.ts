import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

/**
 * Fetch customer data from Capital One (Nessie API)
 */
async function fetchCapitalOneCustomer(): Promise<{ name: string } | null> {
  const apiKey = process.env.NESSIE_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️  NESSIE_API_KEY not found, skipping Capital One customer fetch');
    return null;
  }

  try {
    const apiUrl = `http://api.nessieisreal.com/enterprise/customers?key=${apiKey}`;
    console.log('📡 Fetching customer from Capital One (Nessie API)...');
    
    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Capital One API Error: ${response.status}`, errorText);
      return null;
    }

    const responseData = await response.json();
    
    // Extract customers array
    let customersArray: any[] = [];
    if (Array.isArray(responseData)) {
      customersArray = responseData;
    } else if (responseData?.customers && Array.isArray(responseData.customers)) {
      customersArray = responseData.customers;
    } else if (responseData?.data && Array.isArray(responseData.data)) {
      customersArray = responseData.data;
    }

    if (customersArray.length === 0) {
      console.warn('⚠️  No customers found in Capital One API');
      return null;
    }

    // Use first customer
    const customer = customersArray[0];
    const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.name || 'Capital One User';
    
    console.log(`✅ Found customer: ${name}`);
    return { name };
  } catch (error) {
    console.error('❌ Error fetching Capital One customer:', error);
    return null;
  }
}

/**
 * Fetch account balance from Capital One (Nessie API)
 * Only includes accounts with balance < 20,000 USD
 */
async function fetchCapitalOneBalance(): Promise<number | null> {
  const apiKey = process.env.NESSIE_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️  NESSIE_API_KEY not found, skipping Capital One balance fetch');
    return null;
  }

  try {
    const apiUrl = `http://api.nessieisreal.com/enterprise/accounts?key=${apiKey}`;
    console.log('📡 Fetching account balance from Capital One (Nessie API)...');
    
    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Capital One API Error: ${response.status}`, errorText);
      return null;
    }

    const responseData = await response.json();
    
    // Extract accounts array
    let accountsArray: any[] = [];
    if (Array.isArray(responseData)) {
      accountsArray = responseData;
    } else if (responseData?.accounts && Array.isArray(responseData.accounts)) {
      accountsArray = responseData.accounts;
    } else if (responseData?.data && Array.isArray(responseData.data)) {
      accountsArray = responseData.data;
    }

    if (accountsArray.length === 0) {
      console.warn('⚠️  No accounts found in Capital One API');
      return null;
    }

    // Filter accounts with balance < 20,000 USD
    const filteredAccounts = accountsArray.filter((account) => {
      const balance = account.balance || 0;
      const balanceNum = typeof balance === 'number' ? balance : parseFloat(balance) || 0;
      return balanceNum < 20000;
    });

    console.log(`📊 Found ${accountsArray.length} total accounts, ${filteredAccounts.length} with balance < $20,000`);

    if (filteredAccounts.length === 0) {
      console.warn('⚠️  No accounts found with balance < $20,000');
      return null;
    }

    // Sum filtered account balances
    const totalBalance = filteredAccounts.reduce((sum, account) => {
      const balance = account.balance || 0;
      return sum + (typeof balance === 'number' ? balance : parseFloat(balance) || 0);
    }, 0);
    
    console.log(`✅ Total balance from ${filteredAccounts.length} account(s) (< $20k): $${totalBalance.toFixed(2)}`);
    return totalBalance;
  } catch (error) {
    console.error('❌ Error fetching Capital One balance:', error);
    return null;
  }
}

/**
 * Generate random gibberish string for external_user_id
 */
function generateRandomUserId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const length = 16;
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Merchant ID to name mapping (same as API route)
const MERCHANT_NAMES: Record<number, string> = {
  44: "Amazon",
  165: "Costco",
  19: "Doordash",
  40: "Instacart",
  12: "Target",
  36: "Ubereats",
  45: "Walmart",
};

/**
 * Fetch transactions from Knot API
 */
async function fetchKnotTransactions(externalUserId: string = 'user-123', limit: number = 20): Promise<any[]> {
  const clientId = process.env.KNOT_CLIENT_ID || 'dda0778d-9486-47f8-bd80-6f2512f9bcdb';
  const clientSecret = process.env.KNOT_CLIENT_SECRET || '884d84e855054c32a8e39d08fcd9845d';
  const apiUrl = process.env.KNOT_API_URL || 'https://knot.tunnel.tel/transactions/sync';

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const authHeader = `Basic ${credentials}`;

  const merchantIds = [44, 165, 19, 40, 12, 36, 45]; // All available merchants
  const allTransactions: any[] = [];

  console.log('📡 Fetching transactions from Knot API...');

  for (const merchantId of merchantIds) {
    try {
      const requestBody = {
        merchant_id: merchantId,
        external_user_id: externalUserId,
        limit,
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(requestBody),
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`   ⚠️  Skipping merchant ${merchantId}: ${response.status}`);
        continue;
      }

      const responseData = await response.json();

      // Handle different response formats
      let transactions: any[] = [];
      if (Array.isArray(responseData)) {
        transactions = responseData;
      } else if (responseData?.transactions && Array.isArray(responseData.transactions)) {
        transactions = responseData.transactions;
      } else if (responseData?.data && Array.isArray(responseData.data)) {
        transactions = responseData.data;
      } else if (responseData?.items && Array.isArray(responseData.items)) {
        transactions = responseData.items;
      }

      // Enrich transactions with merchant info
      const enrichedTransactions = transactions.map((tx: any) => ({
        ...tx,
        merchant_id: merchantId,
        merchant_name: MERCHANT_NAMES[merchantId] || `Merchant ${merchantId}`,
      }));

      allTransactions.push(...enrichedTransactions);
      console.log(`   ✅ Fetched ${transactions.length} transactions from ${MERCHANT_NAMES[merchantId] || `merchant ${merchantId}`}`);
    } catch (error) {
      console.error(`   ❌ Error fetching merchant ${merchantId}:`, error);
    }
  }

  console.log(`✅ Total transactions fetched: ${allTransactions.length}`);
  return allTransactions;
}

/**
 * Extract items from Knot transaction
 */
function extractItems(tx: any): Array<{ itemName: string; quantity: number; pricePerUnit: number; totalPrice: number }> {
  const items = tx.products || tx.items || tx.line_items || tx.order_items || tx.lineItems || [];
  
  if (!Array.isArray(items) || items.length === 0) {
    // If no items, create a single item from the transaction itself
    const amount = Math.abs(tx.amount || 0);
    return [{
      itemName: tx.description || tx.merchant_name || 'Transaction',
      quantity: 1,
      pricePerUnit: amount,
      totalPrice: amount,
    }];
  }
  
  return items.map((item: any) => {
    // Extract price
    const priceValue = 
      (item.price && (item.price.unit_price || item.price.unitPrice)) ||
      item.unit_price || 
      item.unitPrice || 
      (item.price && (item.price.total || item.price.sub_total)) ||
      item.price || 
      item.amount || 
      item.cost || 
      item.total_price || 
      item.totalPrice ||
      item.line_total ||
      item.lineTotal ||
      0;
    
    let price = 0;
    if (typeof priceValue === 'number') {
      price = priceValue;
    } else if (typeof priceValue === 'string') {
      const cleaned = priceValue.replace(/[^0-9.-]/g, '');
      price = parseFloat(cleaned) || 0;
    }
    
    const quantityValue = item.quantity || item.qty || item.quantity_ordered || 1;
    const quantity = typeof quantityValue === 'number' ? quantityValue : parseInt(String(quantityValue), 10) || 1;
    
    const pricePerUnit = quantity > 0 ? price / quantity : price;
    const totalPrice = price;
    
    return {
      itemName: item.name || item.description || item.title || item.product_name || item.productName || 'Unknown Item',
      quantity,
      pricePerUnit,
      totalPrice,
    };
  });
}

/**
 * Get merchant name from transaction
 */
function getMerchantName(tx: any): string {
  return (
    tx.merchant_name ||
    tx.merchant?.name ||
    (tx.merchant_id && MERCHANT_NAMES[tx.merchant_id]) ||
    tx.description?.split(' ')[0] ||
    'Unknown Merchant'
  );
}

/**
 * Seed a single user with data from APIs
 */
async function seedUser(userId: number, externalUserId: string, userName?: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🌱 Seeding User ${userId} (external_user_id: ${externalUserId})`);
  console.log('='.repeat(60));

  // Fetch user data from Capital One (only if userName not provided)
  const customerData = userName ? null : await fetchCapitalOneCustomer();
  const balance = userName ? null : await fetchCapitalOneBalance();
  
  const finalUserName = userName || customerData?.name || `User ${userId}`;
  // Use provided balance from API, or use defaults based on userId
  const userBalance = balance !== null ? balance : (userId === 1 ? 19218.0 : 25990.0);

  // Get or create user
  let user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (user) {
    // Update existing user with Capital One data
    user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: finalUserName,
        balance: userBalance,
      },
    });
    console.log(`✅ Updated User ${userId}: ${user.name} (Balance: $${user.balance.toFixed(2)})`);
  } else {
    // Create user if it doesn't exist
    user = await prisma.user.create({
      data: {
        id: userId,
        name: finalUserName,
        balance: userBalance,
      },
    });
    console.log(`✅ Created User ${userId}: ${user.name} (Balance: $${user.balance.toFixed(2)})`);
  }

  // Fetch transactions from Knot API with random external_user_id
  const knotTransactions = await fetchKnotTransactions(externalUserId, 10);
    
  if (knotTransactions.length === 0) {
    console.log(`⚠️  No transactions fetched from Knot API for User ${userId}, creating sample transaction...`);
    
    // Create a sample transaction if no API data
    const sampleTransaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        merchantName: 'Sample Merchant',
        location: '123 Main St',
        datetime: new Date(),
        items: {
          create: [
            {
              itemName: 'Sample Item',
              quantity: 1,
              pricePerUnit: 10.0,
              totalPrice: 10.0,
            },
          ],
        },
      },
      include: {
        items: true,
      },
    });
    
    console.log(`✅ Created sample transaction: ${sampleTransaction.merchantName}`);
    return { successCount: 1, skipCount: 0 };
  }

  // Insert transactions into database
  console.log(`\n📥 Inserting ${knotTransactions.length} transactions into database...`);
  
  let successCount = 0;
  let skipCount = 0;

  for (const tx of knotTransactions) {
    try {
      // Parse date
      let transactionDate: Date;
      if (tx.date) {
        transactionDate = new Date(tx.date);
      } else if (tx.datetime) {
        transactionDate = new Date(tx.datetime);
      } else if (tx.created_at) {
        transactionDate = new Date(tx.created_at);
      } else {
        transactionDate = new Date();
      }

      // Skip if date is invalid
      if (isNaN(transactionDate.getTime())) {
        console.log(`   ⚠️  Skipping transaction with invalid date: ${tx.id || 'unknown'}`);
        skipCount++;
        continue;
      }

      // Extract items
      const items = extractItems(tx);
      
      if (items.length === 0) {
        console.log(`   ⚠️  Skipping transaction with no items: ${tx.id || 'unknown'}`);
        skipCount++;
        continue;
      }

      // Get merchant name
      const merchantName = getMerchantName(tx);
      
      // Check if transaction already exists (by merchant name, date, and user)
      const existingTx = await prisma.transaction.findFirst({
        where: {
          userId: user.id,
          merchantName: merchantName,
          datetime: transactionDate,
        },
      });

      if (existingTx) {
        console.log(`   ⏭️  Skipping duplicate transaction: ${merchantName} on ${transactionDate.toISOString()}`);
        skipCount++;
        continue;
      }

      // Create transaction with source marker
      await prisma.transaction.create({
        data: {
          userId: user.id,
          merchantName: merchantName,
          location: tx.location || null,
          datetime: transactionDate,
          source: 'knot', // Mark as coming from Knot API
          items: {
            create: items,
          },
        },
      });

      successCount++;
      console.log(`   ✅ Inserted: ${merchantName} (${items.length} items)`);
    } catch (error) {
      console.error(`   ❌ Error inserting transaction ${tx.id || 'unknown'}:`, error);
      skipCount++;
    }
  }

  console.log(`\n✅ User ${userId} seed completed!`);
  console.log(`   - Successfully inserted: ${successCount} transactions`);
  console.log(`   - Skipped: ${skipCount} transactions`);

  return { successCount, skipCount };
}

/**
 * Main seed function - Creates 2 users with different data
 */
async function main() {
  console.log('🌱 Starting database seed with API data for 2 users...\n');

  try {
    // Use specific external_user_ids for each user to get different data from Knot API
    // User 1 -> "user-123", User 2 -> "user-456"
    const user1ExternalId = "user-123";
    const user2ExternalId = "user-456";

    console.log(`Using external_user_ids:`);
    console.log(`  User 1: ${user1ExternalId}`);
    console.log(`  User 2: ${user2ExternalId}\n`);

    // Seed User 1 - Chloë Grace Moretz
    const user1Result = await seedUser(1, user1ExternalId, 'Chloë Grace Moretz');
    
    // Seed User 2 - Shailene Woodley
    const user2Result = await seedUser(2, user2ExternalId, 'Shailene Woodley');

    // Display final summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 FINAL DATABASE SUMMARY');
    console.log('='.repeat(60));

    const users = await prisma.user.findMany({
      include: {
        transactions: {
          include: {
            items: true,
          },
          orderBy: {
            datetime: 'desc',
          },
          take: 3,
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    for (const user of users) {
      console.log(`\n👤 User ${user.id}: ${user.name}`);
      console.log(`   Balance: $${user.balance.toFixed(2)}`);
      console.log(`   Total Transactions: ${user.transactions.length}`);
      
      if (user.transactions.length > 0) {
        console.log(`   Recent Transactions:`);
        user.transactions.forEach((tx) => {
          const total = tx.items.reduce((sum, item) => sum + item.totalPrice, 0);
          console.log(`     - ${tx.merchantName}: $${total.toFixed(2)} (${tx.items.length} items)`);
        });
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ Seed completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ Error during seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
