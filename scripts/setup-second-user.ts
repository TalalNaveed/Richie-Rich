import { 
  getOrCreateUser, 
  createOrUpdateAccount, 
  initDatabase,
  closeDatabase
} from '../lib/database'
import { saveKnotTransactionToDB } from '../lib/transaction-db-helper'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../.env') })

/**
 * Fetch transactions directly from Knot API (for Node.js scripts)
 */
async function fetchKnotTransactions(externalUserId: string, limit: number = 50): Promise<any[]> {
  const clientId = process.env.KNOT_CLIENT_ID || 'dda0778d-9486-47f8-bd80-6f2512f9bcdb'
  const clientSecret = process.env.KNOT_CLIENT_SECRET || '884d84e855054c32a8e39d08fcd9845d'
  const apiUrl = process.env.KNOT_API_URL || 'https://knot.tunnel.tel/transactions/sync'

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const authHeader = `Basic ${credentials}`

  const merchantIds = [44, 165, 19, 40, 12, 36, 45] // All available merchants
  const allTransactions: any[] = []

  for (const merchantId of merchantIds) {
    try {
      const requestBody = {
        merchant_id: merchantId,
        external_user_id: externalUserId,
        limit,
      }

      console.log(`   Fetching from merchant ${merchantId}...`)

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.log(`   ⚠️  Skipping merchant ${merchantId}: ${response.status}`)
        continue
      }

      const responseData = await response.json()

      // Handle different response formats
      let transactions: any[] = []
      if (Array.isArray(responseData)) {
        transactions = responseData
      } else if (responseData?.transactions && Array.isArray(responseData.transactions)) {
        transactions = responseData.transactions
      } else if (responseData?.data && Array.isArray(responseData.data)) {
        transactions = responseData.data
      } else if (responseData?.items && Array.isArray(responseData.items)) {
        transactions = responseData.items
      }

      allTransactions.push(...transactions)
    } catch (error) {
      console.error(`   ❌ Error fetching merchant ${merchantId}:`, error)
    }
  }

  return allTransactions
}

/**
 * Script to fetch and store transactions for a second user
 * Uses different external_user_id to get different data from Knot API
 */
async function setupSecondUser() {
  try {
    console.log('🚀 Setting up second user with different data...\n')

    // Initialize database
    await initDatabase()

    // Create second user
    const user2 = await getOrCreateUser({
      email: 'user2@example.com',
      name: 'Jane Smith'
    })
    console.log(`✅ Created/found user 2: ID ${user2}, email: user2@example.com`)

    // Create account for user 2
    const account2 = await createOrUpdateAccount({
      userId: user2,
      accountNumber: '9876543210',
      accountHolderName: 'Jane Smith',
      accountBalance: 7500.50,
      accountType: 'checking',
      institution: 'Capital One'
    })
    console.log(`✅ Created/found account for user 2: ID ${account2}, Balance: $7500.50`)

    // Fetch transactions for a different external_user_id (different user data)
    const externalUserId2 = 'user-456' // Different from default "user-123"
    console.log(`\n📥 Fetching transactions for external_user_id: ${externalUserId2}...`)
    
    const knotTransactions = await fetchKnotTransactions(externalUserId2, 50)
    console.log(`✅ Fetched ${knotTransactions.length} transactions from Knot API`)

    if (knotTransactions.length === 0) {
      console.log('⚠️  No transactions found for this external_user_id')
      console.log('💡 Try creating a session first or use a different external_user_id')
      return
    }

    // Save transactions to database for user 2
    console.log(`\n💾 Saving ${knotTransactions.length} transactions to database for user 2...`)
    let savedCount = 0
    let errorCount = 0

    for (const knotTx of knotTransactions) {
      try {
        await saveKnotTransactionToDB(knotTx, user2, account2)
        savedCount++
        if (savedCount % 10 === 0) {
          console.log(`   Saved ${savedCount}/${knotTransactions.length} transactions...`)
        }
      } catch (error) {
        errorCount++
        console.error(`   Error saving transaction ${knotTx.id}:`, error)
      }
    }

    console.log(`\n✅ Setup complete!`)
    console.log(`   User 2 ID: ${user2}`)
    console.log(`   Account ID: ${account2}`)
    console.log(`   Transactions saved: ${savedCount}`)
    console.log(`   Errors: ${errorCount}`)
    console.log(`\n📊 You now have data for 2 different users:`)
    console.log(`   User 1: user-123 (external_user_id)`)
    console.log(`   User 2: user-456 (external_user_id)`)
    console.log(`\n💡 Query transactions with:`)
    console.log(`   GET /api/transactions/db?userId=1 (User 1)`)
    console.log(`   GET /api/transactions/db?userId=${user2} (User 2)`)

  } catch (error) {
    console.error('❌ Error setting up second user:', error)
    throw error
  } finally {
    await closeDatabase()
  }
}

// Run if executed directly
setupSecondUser()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error)
    process.exit(1)
  })

export { setupSecondUser }

