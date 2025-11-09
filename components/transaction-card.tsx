import { ArrowUpRight, ArrowDownLeft, Wallet, CreditCard, Music, UtensilsCrossed, Receipt } from "lucide-react"
import Image from "next/image"

interface TransactionCardProps {
  transaction: {
    id: string
    merchant: string
    amount: number
    date: string
    type: "credit" | "debit"
    category: string
    source?: string // "knot", "receipt", "manual"
    items?: Array<{
      name: string
      price: number
      quantity?: number
    }>
  }
  onClick?: () => void
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Groceries":
      return <Wallet className="w-5 h-5" />
    case "Entertainment":
      return <Music className="w-5 h-5" />
    case "Dining":
      return <UtensilsCrossed className="w-5 h-5" />
    default:
      return <CreditCard className="w-5 h-5" />
  }
}

export function TransactionCard({ transaction, onClick }: TransactionCardProps) {
  const isCredit = transaction.type === "credit"
  const bgColor = isCredit ? "from-primary/10 to-primary/5" : "from-secondary/10 to-secondary/5"
  const textColor = isCredit ? "text-primary" : "text-secondary"
  const icon = isCredit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />
  const hasItems = transaction.items && transaction.items.length > 0

  return (
    <div 
      onClick={onClick}
      className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 transition-all duration-300 hover:shadow-lg hover:bg-white/90 dark:hover:bg-white/20 cursor-pointer p-4 rounded-2xl"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 bg-gradient-to-br ${bgColor} rounded-full flex items-center justify-center ${textColor}`}
          >
            {getCategoryIcon(transaction.category)}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">{transaction.merchant}</h3>
              {transaction.source === 'knot' && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                  <div className="w-3 h-3 relative">
                    <Image src="/knot.avif" alt="Knot" fill className="object-contain" />
                  </div>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Knot</span>
                </div>
              )}
              {transaction.source === 'receipt' && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20">
                  <Receipt className="w-3 h-3 text-green-600 dark:text-green-400" />
                  <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Receipt</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{transaction.category}</p>
            {hasItems && (
              <div className="mt-2 space-y-1">
                {/* Show only first 2 items max */}
                {transaction.items!.slice(0, 2).map((item, idx) => {
                  const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0
                  return (
                    <p key={idx} className="text-xs text-muted-foreground">
                      • {item.name} - ${price.toFixed(2)}
                      {item.quantity && item.quantity > 1 && ` (x${item.quantity})`}
                    </p>
                  )
                })}
                {/* Only show "+X more" if there are more than 2 items */}
                {transaction.items!.length > 2 && (
                  <p className="text-xs text-muted-foreground">
                    +{transaction.items!.length - 2} more item{transaction.items!.length - 2 !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className={`font-bold text-lg ${textColor}`}>
            {isCredit ? "+" : "-"}${transaction.amount.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">{transaction.date}</p>
        </div>
      </div>
    </div>
  )
}
