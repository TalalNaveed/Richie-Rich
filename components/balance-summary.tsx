import { Wallet } from "lucide-react"
import { type NessieAccount } from "@/lib/nessie-api"

interface BalanceSummaryProps {
  accounts: NessieAccount[]
  loading?: boolean
}

export function BalanceSummary({ accounts, loading = false }: BalanceSummaryProps) {
  const accountsArray = Array.isArray(accounts) ? accounts : []
  const account = accountsArray[0]

  // Calculate total balance across all accounts
  const totalBalance = accountsArray.reduce((sum, acc) => {
    return sum + (acc.balance || 0)
  }, 0)

  // Format balance as currency
  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalBalance)

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 min-w-fit">
        <p className="text-sm font-medium text-muted-foreground mb-1">Available Balance</p>
        <p className="text-3xl font-bold text-primary">...</p>
      </div>
    )
  }

  return (
    <div className="p-6 rounded-2xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 min-w-fit">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Available Balance</p>
          <p className="text-4xl font-bold text-primary">{formattedBalance}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {account?.nickname || account?.type || 'Capital One'}
          </p>
        </div>
        <Wallet className="w-6 h-6 text-muted-foreground" />
      </div>
    </div>
  )
}

