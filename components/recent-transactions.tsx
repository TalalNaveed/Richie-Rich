"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Receipt } from "lucide-react"
import Image from "next/image"
import { TransactionCard } from "./transaction-card"
import { TransactionDetailsModal } from "./transaction-details-modal"

interface Transaction {
  id: string
  merchant: string
  amount: number
  date: string
  type: "credit" | "debit"
  category: string
  location?: string // Store location/address
  source?: string // "knot", "receipt", "manual"
  items?: Array<{
    name: string
    price: number
    quantity?: number
  }>
}

// Database transaction interface
interface DatabaseTransaction {
  id: number
  userId: number
  accountId?: number
  name: string
  location?: string
  source?: string // "knot", "receipt", "manual"
  items: string[]
  quantities: number[]
  prices: number[]
  pricePerUnit: number[]
  totalAmount: number
  datetime: string
  createdAt: string
}

// Map database transaction to our Transaction interface
function mapDatabaseTransaction(dbTx: DatabaseTransaction): Transaction {
  // Parse date from database
  const date = new Date(dbTx.datetime || dbTx.createdAt)
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  // All transactions from receipts are debits (money spent)
  const type: "credit" | "debit" = "debit"

  // Get merchant name - use name field (which contains merchantName from Prisma)
  let merchant = dbTx.name || dbTx.location || "Unknown Merchant";
  
  // Ensure we have a valid merchant name
  merchant = merchant.trim() || "Unknown Merchant";

  // Default category (could be enhanced with categoryTags from receipt)
  const category = "Other"

  // Map items from database format - ensure we properly extract items
  const items = dbTx.items && Array.isArray(dbTx.items) && dbTx.items.length > 0
    ? dbTx.items.map((itemName, index) => {
        // prices[index] is the total price for the item line
        const totalPrice = (dbTx.prices && dbTx.prices[index]) || (dbTx.pricePerUnit && dbTx.pricePerUnit[index] * (dbTx.quantities[index] || 1)) || 0
        const quantity = (dbTx.quantities && dbTx.quantities[index]) || 1
        const pricePerUnit = dbTx.pricePerUnit && dbTx.pricePerUnit[index] !== undefined 
          ? dbTx.pricePerUnit[index] 
          : (totalPrice / quantity)
        
        return {
          name: itemName || `Item ${index + 1}`,
          price: totalPrice, // Total price for this item line
          pricePerUnit: pricePerUnit, // Price per unit
          quantity: quantity,
        }
      })
    : []

  return {
    id: `db-${dbTx.id}`,
    merchant,
    amount: Math.abs(dbTx.totalAmount || 0),
    date: formattedDate,
    type,
    category,
    location: dbTx.location || undefined, // Include location if available
    source: dbTx.source || 'manual', // Include source
    items,
  }
}

interface RecentTransactionsProps {
  userId?: number
}

export function RecentTransactions({ userId }: RecentTransactionsProps = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const TRANSACTIONS_PER_PAGE = 5

  const fetchTransactions = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      
      // Fetch transactions from Prisma API
      const url = userId 
        ? `/api/transactions/prisma?limit=50&userId=${userId}`
        : '/api/transactions/prisma?limit=50'
      const response = await fetch(url, { cache: 'no-store' })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`)
      }
      
      const dbTransactions: DatabaseTransaction[] = await response.json()
      
      // Filter to only show transactions with items
      const validTransactions = dbTransactions.filter(tx => {
        return tx.items && Array.isArray(tx.items) && tx.items.length > 0
      })
      
      const mappedTransactions = validTransactions.map(mapDatabaseTransaction)
      
      setTransactions(mappedTransactions)
    } catch (err) {
      console.error("Error fetching transactions:", err)
      setError(err instanceof Error ? err.message : "Failed to load transactions")
      // Fallback to empty array on error
      setTransactions([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [userId])

  useEffect(() => {
    fetchTransactions()
    
    // Poll for new transactions every 10 seconds
    const interval = setInterval(() => {
      fetchTransactions(true)
    }, 10000)
    
    // Listen for receipt saved events to refresh transactions immediately
    const handleReceiptSaved = () => {
      console.log('🔄 [RecentTransactions] Receipt saved event received, refreshing transactions...')
      // Small delay to ensure database is updated
      setTimeout(() => {
        fetchTransactions(true)
      }, 500)
    }

    window.addEventListener('receiptSaved', handleReceiptSaved)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('receiptSaved', handleReceiptSaved)
    }
  }, [fetchTransactions])

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

  if (loading && transactions.length === 0) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
          <h2 className="text-2xl font-bold mb-2">Recent Transactions</h2>
          <p className="text-muted-foreground">Your latest financial activity</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-4 h-4 relative">
                  <Image src="/knot.avif" alt="Knot" fill className="object-contain animate-pulse" />
                </div>
                <span>Fetching from Knot...</span>
              </div>
            </div>
          </div>
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Recent Transactions</h2>
          <p className="text-muted-foreground">Your latest financial activity</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-4 h-4 relative">
                <Image src="/knot.avif" alt="Knot" fill className="object-contain" />
              </div>
              <span>Knot API</span>
            </div>
            <span className="text-muted-foreground">•</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Receipt className="w-4 h-4" />
              <span>Receipt Upload</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => fetchTransactions(true)}
          disabled={refreshing}
          className="p-2 rounded-lg backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 hover:bg-white/95 dark:hover:bg-white/15 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Refresh transactions"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
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
