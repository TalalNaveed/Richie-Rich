"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Loader2 } from "lucide-react"
import { TransactionCard } from "./transaction-card"
import { getTransactions, KnotTransaction } from "@/lib/knot-api"

interface Transaction {
  id: string
  merchant: string
  amount: number
  date: string
  type: "credit" | "debit"
  category: string
  items?: Array<{
    name: string
    price: number
    quantity?: number
  }>
}

// Map Knot API transaction to our Transaction interface
function mapKnotTransaction(knotTx: KnotTransaction): Transaction {
  // Format date - API uses 'datetime' field with ISO format
  const getDate = (tx: any): Date => {
    const dateStr = tx.datetime || tx.date || tx.created_at || tx.timestamp || tx.transaction_date || tx.purchase_date || tx.order_date
    if (!dateStr) {
      console.warn("No date found in transaction:", tx.id)
      return new Date()
    }
    
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
    
    console.warn("Could not parse date:", dateStr, "for transaction:", tx.id)
    return new Date()
  }
  
  const date = getDate(knotTx)
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  // Determine transaction type based on amount
  const type: "credit" | "debit" = knotTx.type || (knotTx.amount >= 0 ? "credit" : "debit")

  // Get merchant name (where they bought from)
  const merchant = knotTx.merchant_name || knotTx.merchant?.name || "Unknown Merchant"

  // Get category
  const category = knotTx.category || knotTx.merchant?.category || "Other"

  // Extract items from transaction - API uses 'products' array
  const items = knotTx.products || knotTx.items || knotTx.line_items || []

  return {
    id: knotTx.id || knotTx.external_id || "",
    merchant,
    amount: Math.abs(knotTx.amount || 0),
    date: formattedDate,
    type,
    category,
    items: items.map((item: any) => {
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
    }),
  }
}

export function RecentTransactions({ onAddReceipt }: { onAddReceipt: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTransactions() {
      try {
        setLoading(true)
        setError(null)
        // Use a consistent user ID for all transactions
        const userId = "user-123"
        const knotTransactions = await getTransactions(undefined, userId, 5)
        
        // Log raw transactions for debugging
        console.log("Raw transactions from API:", knotTransactions)
        
        const mappedTransactions = knotTransactions.map(mapKnotTransaction)
        
        // Log mapped transactions for debugging
        console.log("Mapped transactions:", mappedTransactions)
        
        setTransactions(mappedTransactions)
      } catch (err) {
        console.error("Error fetching transactions:", err)
        setError(err instanceof Error ? err.message : "Failed to load transactions")
        // Fallback to empty array on error
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  const displayTransactions = expanded ? transactions : transactions.slice(0, 3)

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Recent Transactions</h2>
          <p className="text-muted-foreground">Your latest financial activity</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Recent Transactions</h2>
          <p className="text-muted-foreground">Your latest financial activity</p>
        </div>
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Recent Transactions</h2>
          <p className="text-muted-foreground">Your latest financial activity</p>
        </div>
        <div className="p-4 rounded-lg bg-muted text-muted-foreground text-sm text-center">
          No transactions found
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Recent Transactions</h2>
        <p className="text-muted-foreground">Your latest financial activity</p>
      </div>

      <div className="space-y-3">
        {displayTransactions.map((transaction, index) => (
          <div key={transaction.id} className={`animate-in fade-in delay-${100 * (index + 1)}`}>
            <TransactionCard transaction={transaction} />
          </div>
        ))}
      </div>

      {/* Expand/Collapse Button */}
      {transactions.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-6 py-3 backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-2xl flex items-center justify-center gap-2 text-foreground font-medium hover:bg-white/95 dark:hover:bg-white/15 transition-all duration-300"
        >
          {expanded ? "Show Less" : "Show More Transactions"}
          <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}

      <button
        onClick={onAddReceipt}
        className="w-full mt-6 py-3 px-6 bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-lg font-medium hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
      >
        <span className="text-lg">+</span>
        Add Receipt
      </button>
    </div>
  )
}
