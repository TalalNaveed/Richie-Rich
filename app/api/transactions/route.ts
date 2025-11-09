import { NextResponse } from "next/server"

// Merchant ID to name mapping
const MERCHANT_NAMES: Record<number, string> = {
  44: "Amazon",
  165: "Costco",
  19: "Doordash",
  40: "Instacart",
  12: "Target",
  36: "Ubereats",
  45: "Walmart",
}

// Merchant ID to category mapping
const MERCHANT_CATEGORIES: Record<number, string> = {
  44: "Shopping",
  165: "Groceries",
  19: "Dining",
  40: "Groceries",
  12: "Shopping",
  36: "Dining",
  45: "Groceries",
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const merchantId = searchParams.get("merchant_id")
  const userIdParam = searchParams.get("userId")
  
  // Map userId to different external_user_ids to get different data
  // User 1 -> "user-123", User 2 -> "user-456", default -> "user-123"
  const getExternalUserId = (userId: string | null): string => {
    if (userId === "1") return "user-123"
    if (userId === "2") return "user-456"
    return "user-123" // Default fallback
  }
  
  const externalUserId = searchParams.get("external_user_id") || getExternalUserId(userIdParam)
  const limit = parseInt(searchParams.get("limit") || "5", 10)
  const cursor = searchParams.get("cursor")

  // Log which external_user_id is being used
  if (userIdParam) {
    console.log(`📋 Using external_user_id "${externalUserId}" for userId ${userIdParam}`)
  }

  // Get credentials from environment variables
  const clientId = process.env.KNOT_CLIENT_ID || "dda0778d-9486-47f8-bd80-6f2512f9bcdb"
  const clientSecret = process.env.KNOT_CLIENT_SECRET || "884d84e855054c32a8e39d08fcd9845d"
  const apiUrl = process.env.KNOT_API_URL || "https://knot.tunnel.tel/transactions/sync"

  // Create Basic Auth header
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  const authHeader = `Basic ${credentials}`

  // Default merchant IDs to fetch from if none specified
  const merchantIds = merchantId
    ? [parseInt(merchantId, 10)]
    : [44, 165, 19, 40, 12, 36, 45] // All available merchants

  try {
    // Fetch transactions from all specified merchants
    const allTransactions: any[] = []

    for (const mid of merchantIds) {
      try {
        const requestBody: any = {
          merchant_id: mid,
          external_user_id: externalUserId,
          limit,
        }

        if (cursor) {
          requestBody.cursor = cursor
        }

        console.log(`Fetching transactions for merchant ${mid} from Knot API`)

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify(requestBody),
          cache: "no-store",
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`API Error for merchant ${mid}:`, response.status, response.statusText, errorText)
          continue // Skip this merchant and continue with others
        }

        const responseData = await response.json()

        // Log the response structure for debugging
        console.log(`Response structure for merchant ${mid}:`, JSON.stringify(responseData).substring(0, 500))

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

        // Log first transaction structure for debugging
        if (transactions.length > 0) {
          console.log(`Sample transaction structure for merchant ${mid}:`, JSON.stringify(transactions[0]).substring(0, 1000))
        }

        // Helper function to extract and normalize items from transaction
        const extractItems = (tx: any): any[] => {
          // Based on API response, items are in 'products' array
          const items = tx.products || tx.items || tx.line_items || tx.order_items || tx.lineItems || []
          
          if (!Array.isArray(items)) return []
          
          return items.map((item: any) => {
            // Price is in item.price.unit_price (as a string in the API response)
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
              0
            
            // Convert to number (API returns prices as strings)
            let price = 0
            if (typeof priceValue === 'number') {
              price = priceValue
            } else if (typeof priceValue === 'string') {
              // Remove currency symbols and parse
              const cleaned = priceValue.replace(/[^0-9.-]/g, '')
              price = parseFloat(cleaned) || 0
            }
            
            // Ensure quantity is a number
            const quantityValue = item.quantity || item.qty || item.quantity_ordered || 1
            const quantity = typeof quantityValue === 'number' ? quantityValue : parseInt(String(quantityValue), 10) || 1
            
            return {
              name: item.name || item.description || item.title || item.product_name || item.productName || "Unknown Item",
              price,
              quantity,
            }
          })
        }

        // Get merchant name from response or transaction
        const getMerchantName = (tx: any, responseData: any): string => {
          return (
            responseData?.merchant?.name ||
            tx.merchant?.name ||
            MERCHANT_NAMES[mid] ||
            `Merchant ${mid}`
          )
        }

        // Add merchant info and normalize items for each transaction
        const enrichedTransactions = transactions.map((tx) => {
          // Extract transaction amount from price.total or payment_methods
          let transactionAmount = tx.amount
          if (!transactionAmount || transactionAmount === 0) {
            if (tx.price && tx.price.total) {
              transactionAmount = parseFloat(String(tx.price.total)) || 0
            } else if (tx.payment_methods && tx.payment_methods[0] && tx.payment_methods[0].transaction_amount) {
              transactionAmount = parseFloat(String(tx.payment_methods[0].transaction_amount)) || 0
            }
          }
          
          // Extract date from datetime field
          const transactionDate = tx.datetime || tx.date || tx.created_at || tx.timestamp
          
          return {
            ...tx,
            id: tx.id || tx.external_id,
            amount: transactionAmount,
            date: transactionDate,
            datetime: transactionDate, // Keep datetime for sorting
            merchant_id: mid,
            merchant_name: getMerchantName(tx, responseData),
            category: MERCHANT_CATEGORIES[mid] || "Other",
            items: extractItems(tx),
          }
        })

        allTransactions.push(...enrichedTransactions)
      } catch (error) {
        console.error(`Error fetching transactions for merchant ${mid}:`, error)
        continue
      }
    }

    // Sort by date (most recent first)
    allTransactions.sort((a, b) => {
      // Try multiple date field formats - API uses 'datetime' field
      const getDate = (tx: any): Date => {
        const dateStr = tx.datetime || tx.date || tx.created_at || tx.timestamp || tx.transaction_date || tx.purchase_date || tx.order_date
        if (!dateStr) return new Date(0)
        
        // Try parsing as ISO string (API returns ISO format like "2024-01-30T06:57:24.069000")
        const date = new Date(dateStr)
        if (!isNaN(date.getTime())) {
          return date
        }
        
        // Try parsing as Unix timestamp (seconds or milliseconds)
        const timestamp = typeof dateStr === 'number' ? dateStr : parseInt(String(dateStr), 10)
        if (!isNaN(timestamp)) {
          // If timestamp is in seconds (less than year 2000 in ms), convert to ms
          const dateFromTs = timestamp < 946684800000 ? new Date(timestamp * 1000) : new Date(timestamp)
          if (!isNaN(dateFromTs.getTime())) {
            return dateFromTs
          }
        }
        
        return new Date(0)
      }
      
      const dateA = getDate(a).getTime()
      const dateB = getDate(b).getTime()
      return dateB - dateA
    })

    // Limit total results
    const limitedTransactions = allTransactions.slice(0, limit * merchantIds.length)

    console.log(`✅ Fetched ${limitedTransactions.length} transactions from ${merchantIds.length} merchant(s)`)

    return NextResponse.json(limitedTransactions)
  } catch (error) {
    console.error("Fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch transactions", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

