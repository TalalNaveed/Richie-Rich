"use client"

import { useState, useEffect } from "react"
import { BalanceSummary } from "./balance-summary"
import { RecentTransactions } from "./recent-transactions"
import { ReceiptUploadSidebar } from "./receipt-upload-sidebar"
import { AnalyticsDashboard } from "./analytics-dashboard"
import { StockRecommendations } from "./stock-recommendations"
import { XNewsWidget } from "./x-news-widget"
import { ThemeToggle } from "./theme-toggle"
import { Footer } from "./footer"
import { getCustomers, getAccounts, type NessieAccount, type NessieCustomer } from "@/lib/nessie-api"

type UserData = {
  id: number
  name: string
  balance: number
  transactions: Array<{
    id: number
    merchantName: string
    location: string | null
    datetime: string | Date
    items: Array<{
      id: number
      itemName: string
      quantity: number
      pricePerUnit: number
      totalPrice: number
    }>
  }>
}

interface DashboardProps {
  userData?: UserData
  userId?: number
}

export function Dashboard({ userData, userId }: DashboardProps = {}) {
  const [userName, setUserName] = useState("")
  const [userBalance, setUserBalance] = useState<number>(0)
  const [accounts, setAccounts] = useState<NessieAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // If userData is provided, use it directly
    if (userData) {
      setUserName(userData.name)
      setUserBalance(userData.balance)
      setLoading(false)
      return
    }

    // Otherwise fetch from API
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

        // Filter accounts with balance < 20,000 USD
        const filteredAccounts = accountsArray.filter((account) => {
          const balance = account.balance || 0
          return balance < 20000
        })

        console.log("Fetched accounts:", accountsArray.length, "Filtered (< $20k):", filteredAccounts.length)

        if (filteredAccounts.length > 0) {
          setAccounts(filteredAccounts)
          
          // Calculate total balance from filtered accounts
          const totalBalance = filteredAccounts.reduce((sum, account) => sum + (account.balance || 0), 0)
          setUserBalance(totalBalance)

          // pick a random name if customers available
          if (customers.length > 0) {
            const randomCustomer = customers[Math.floor(Math.random() * customers.length)]
            setUserName(`${randomCustomer.first_name} ${randomCustomer.last_name}`)
          } else {
            setUserName(filteredAccounts[0].nickname || "User")
          }
        } else {
          setUserName("User")
          setError("No accounts found with balance < $20,000.")
        }
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load data.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userData])

  return (
    <>
      {/* Theme Toggle */}
      <ThemeToggle />
      
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-12">
          <div className="fade-in flex items-center gap-4">
            <div>
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
          </div>

          {/* Credit Score Card */}
          <div className="fade-in delay-100">
            <BalanceSummary 
              accounts={userData ? undefined : accounts} 
              balance={userData ? userBalance : undefined}
              loading={loading} 
            />
          </div>
        </div>

        {/* Two Column Layout: Transactions on left, Receipt Upload on right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Recent Transactions - Takes 2 columns on desktop */}
          <div className="lg:col-span-2 fade-in delay-200">
            <RecentTransactions userId={userId || userData?.id} />
          </div>

          {/* Receipt Upload Sidebar - Takes 1 column on desktop, full width on mobile */}
          <div className="lg:col-span-1 fade-in delay-200">
            <ReceiptUploadSidebar />
          </div>
        </div>

        {/* Analytics Section */}
        <div className="fade-in delay-400 mb-12">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Financial Analytics</h2>
            <p className="text-muted-foreground">
              Your savings insights and investment opportunities
            </p>
          </div>
          <AnalyticsDashboard />
        </div>

        {/* Stock Recommendations Section */}
        <div className="fade-in delay-500">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Stock Recommendations</h2>
            <p className="text-muted-foreground">
              Top investment opportunities powered by Dedalus MCP with real-time market analysis
            </p>
          </div>
          <StockRecommendations />
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* X News Widget - Fixed bottom right */}
      <XNewsWidget />
    </main>
    </>
  )
}
