"use client"

import { useState, useEffect } from "react"
import { BalanceSummary } from "./balance-summary"
import { RecentTransactions } from "./recent-transactions"
import { InlineReceiptFlow } from "./inline-receipt-flow"
import { AnalyticsDashboard } from "./analytics-dashboard"
import { getCustomers, getAccounts, type NessieAccount, type NessieCustomer } from "@/lib/nessie-api"

export function Dashboard() {
  const [userName, setUserName] = useState("")
  const [accounts, setAccounts] = useState<NessieAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showReceiptFlow, setShowReceiptFlow] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        console.log("Fetching customers and accounts...")
        let customers: NessieCustomer[] = []
        try {
          customers = await getCustomers()
        } catch (err) {
          console.warn("Customers fetch failed:", err)
        }

        const fetchedAccounts = await getAccounts()
        const accountsArray = Array.isArray(fetchedAccounts)
          ? fetchedAccounts
          : fetchedAccounts
          ? [fetchedAccounts]
          : []

        console.log("Fetched accounts:", accountsArray.length)

        if (accountsArray.length > 0) {
          setAccounts(accountsArray)

          // pick a random name if customers available
          if (customers.length > 0) {
            const randomCustomer = customers[Math.floor(Math.random() * customers.length)]
            setUserName(`${randomCustomer.first_name} ${randomCustomer.last_name}`)
          } else {
            setUserName(accountsArray[0].nickname || "User")
          }
        } else {
          setUserName("User")
          setError("No accounts found.")
        }
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load data.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-12">
          <div className="fade-in">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Hello, <span className="gradient-text">{userName || "User"}</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Welcome back to your financial dashboard
            </p>
            {error && (
              <p className="text-sm text-destructive mt-2">Error: {error}</p>
            )}
          </div>

          {/* Credit Score Card */}
          <div className="fade-in delay-100">
            <BalanceSummary accounts={accounts} loading={loading} />
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="fade-in delay-200 mb-12">
          <RecentTransactions onAddReceipt={() => setShowReceiptFlow(true)} />
        </div>

        {/* Inline Receipt Flow */}
        {showReceiptFlow && (
          <div className="fade-in delay-300 mb-12">
            <InlineReceiptFlow onClose={() => setShowReceiptFlow(false)} />
          </div>
        )}

        {/* Analytics Section */}
        <div className="fade-in delay-400">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Financial Analytics</h2>
            <p className="text-muted-foreground">
              Your savings insights and investment opportunities
            </p>
          </div>
          <AnalyticsDashboard />
        </div>
      </div>
    </main>
  )
}
