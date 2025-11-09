"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { TransactionCard } from "./transaction-card"
import { TransactionDetailsModal } from "./transaction-details-modal"
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

export function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const TRANSACTIONS_PER_PAGE = 5

  useEffect(() => {
    async function fetchTransactions() {
      try {
        setLoading(true)
        setError(null)
        // Use a consistent user ID for all transactions
        // Fetch more transactions to support pagination
        const userId = "user-123"
        const knotTransactions = await getTransactions(undefined, userId, 50)
        
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

  // Calculate pagination
  const totalPages = Math.ceil(transactions.length / TRANSACTIONS_PER_PAGE)
  const startIndex = (currentPage - 1) * TRANSACTIONS_PER_PAGE
  const endIndex = startIndex + TRANSACTIONS_PER_PAGE
  const displayTransactions = transactions.slice(startIndex, endIndex)

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsModalOpen(true)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top of transactions section
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
            <TransactionCard 
              transaction={transaction} 
              onClick={() => handleTransactionClick(transaction)}
            />
          </div>
        ))}
      </div>

      {/* Pagination */}
      {transactions.length > TRANSACTIONS_PER_PAGE && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/95 dark:hover:bg-white/15 transition-all duration-300"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1">
            {/* Show first few pages (1, 2, 3, 4) */}
            {Array.from({ length: Math.min(4, totalPages) }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-4 py-2 rounded-lg backdrop-blur-xl border transition-all duration-300 ${
                  currentPage === page
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white/80 dark:bg-white/10 border-white/20 dark:border-white/10 hover:bg-white/95 dark:hover:bg-white/15"
                }`}
                aria-label={`Page ${page}`}
              >
                {page}
              </button>
            ))}

            {/* Show ellipsis if there are more pages */}
            {totalPages > 4 && (
              <>
                <span className="px-2 text-muted-foreground">...</span>
                {/* Show last page */}
                <button
                  onClick={() => handlePageChange(totalPages)}
                  className={`px-4 py-2 rounded-lg backdrop-blur-xl border transition-all duration-300 ${
                    currentPage === totalPages
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white/80 dark:bg-white/10 border-white/20 dark:border-white/10 hover:bg-white/95 dark:hover:bg-white/15"
                  }`}
                  aria-label={`Page ${totalPages}`}
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/95 dark:hover:bg-white/15 transition-all duration-300"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        transaction={selectedTransaction}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
