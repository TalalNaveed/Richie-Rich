import { TrendingUp } from "lucide-react"
import { type NessieAccount } from "@/lib/nessie-api"

interface BalanceSummaryProps {
  accounts: NessieAccount[]
  loading?: boolean
}

export function BalanceSummary({ accounts, loading = false }: BalanceSummaryProps) {
  const accountsArray = Array.isArray(accounts) ? accounts : []
  const account = accountsArray[0]

  const balance = account ? Math.round(account.balance) : 0
  const creditScore = balance // ✅ use balance as credit score

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 min-w-fit">
        <p className="text-sm font-medium text-muted-foreground mb-1">Credit Score</p>
        <p className="text-3xl font-bold text-primary">...</p>
      </div>
    )
  }

  return (
    <div className="p-6 rounded-2xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 min-w-fit">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Credit Score</p>
          <p className="text-4xl font-bold text-primary">{creditScore}</p>
          <p className="text-xs text-muted-foreground mt-1">
          </p>
        </div>
      </div>
    </div>
  )
}

