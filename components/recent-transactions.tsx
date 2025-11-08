"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { TransactionCard } from "./transaction-card"

interface Transaction {
  id: string
  merchant: string
  amount: number
  date: string
  type: "credit" | "debit"
  category: string
}

const mockTransactions: Transaction[] = [
  {
    id: "1",
    merchant: "Whole Foods Market",
    amount: 47.32,
    date: "Nov 5, 2025",
    type: "debit",
    category: "Groceries",
  },
  {
    id: "2",
    merchant: "Salary Deposit",
    amount: 3500.0,
    date: "Nov 1, 2025",
    type: "credit",
    category: "Income",
  },
  {
    id: "3",
    merchant: "Netflix Subscription",
    amount: 15.99,
    date: "Oct 31, 2025",
    type: "debit",
    category: "Entertainment",
  },
  {
    id: "4",
    merchant: "Spotify Premium",
    amount: 11.99,
    date: "Oct 30, 2025",
    type: "debit",
    category: "Entertainment",
  },
  {
    id: "5",
    merchant: "Freelance Project",
    amount: 250.0,
    date: "Oct 28, 2025",
    type: "credit",
    category: "Income",
  },
  {
    id: "6",
    merchant: "Starbucks",
    amount: 6.45,
    date: "Oct 27, 2025",
    type: "debit",
    category: "Dining",
  },
]

export function RecentTransactions({ onAddReceipt }: { onAddReceipt: () => void }) {
  const [expanded, setExpanded] = useState(false)

  const displayTransactions = expanded ? mockTransactions : mockTransactions.slice(0, 3)

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
      {mockTransactions.length > 3 && (
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
