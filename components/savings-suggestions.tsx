"use client"

import { useState, useEffect } from "react"
import { AlertCircle, TrendingDown, MapPin, DollarSign, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface SavingsItem {
  itemName: string
  receiptPrice: number
  receiptQuantity: number
  alternativeMerchant: string
  alternativeLocation: string | null
  alternativePrice: number
  savings: number
  savingsPercentage: string
}

interface FrequencySavingsItem {
  itemName: string
  frequency: number
  currentAvgPrice: string
  cheaperPrice: string
  monthlySavings: string
  annualSavings: string
}

interface SavingsSuggestionsProps {
  receiptItems: Array<{
    name: string
    price: number
    quantity?: number
  }>
  onClose?: () => void
}

export function SavingsSuggestions({ receiptItems, onClose }: SavingsSuggestionsProps) {
  const [loading, setLoading] = useState(true)
  const [savings, setSavings] = useState<SavingsItem[]>([])
  const [frequencySavings, setFrequencySavings] = useState<FrequencySavingsItem[]>([])
  const [totalSavings, setTotalSavings] = useState("0.00")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (receiptItems.length === 0) {
      setLoading(false)
      return
    }

    async function fetchSavings() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/price-comparison', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: receiptItems.map(item => ({
              name: item.name,
              itemName: item.name,
              price: item.price,
              totalPrice: item.price,
              pricePerUnit: item.price / (item.quantity || 1),
              quantity: item.quantity || 1,
            })),
            userId: 1,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to fetch savings suggestions')
        }

        const data = await response.json()
        setSavings(data.savings || [])
        setFrequencySavings(data.frequencySavings || [])
        setTotalSavings(data.totalPotentialSavings || "0.00")
      } catch (err) {
        console.error('Error fetching savings:', err)
        setError(err instanceof Error ? err.message : 'Failed to load savings suggestions')
      } finally {
        setLoading(false)
      }
    }

    fetchSavings()
  }, [receiptItems])

  if (loading) {
    return (
      <div className="mt-6 backdrop-blur-xl bg-gradient-to-br from-white/90 to-green-50/50 dark:from-white/10 dark:to-green-950/20 border border-green-200/30 dark:border-green-800/20 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-green-600 dark:text-green-400" />
          <h3 className="text-lg font-bold text-green-700 dark:text-green-300">Finding Savings Opportunities...</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 dark:border-green-400"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-6 backdrop-blur-xl bg-gradient-to-br from-red-50/90 to-orange-50/90 dark:from-red-950/30 dark:to-orange-950/30 border border-red-300/40 dark:border-red-700/30 rounded-2xl p-6 shadow-lg">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <h3 className="text-lg font-bold text-red-700 dark:text-red-300 mb-1">Error</h3>
            <p className="text-red-700/80 dark:text-red-300/80">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (savings.length === 0 && frequencySavings.length === 0) {
    return null
  }

  const hasImmediateSavings = savings.length > 0 && parseFloat(totalSavings) > 0

  return (
    <div className="mt-6 space-y-6">
      {/* Immediate Savings Alert */}
      {hasImmediateSavings && (
        <div className="backdrop-blur-xl bg-gradient-to-br from-green-50/90 to-emerald-50/90 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-300/40 dark:border-green-700/30 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <TrendingDown className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-green-700 dark:text-green-300 mb-2">
                💰 Potential Savings Found!
              </h3>
              <p className="text-green-700/80 dark:text-green-300/80">
                You could save <strong className="text-green-800 dark:text-green-200 text-xl">${totalSavings}</strong> on this purchase by shopping at different stores!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Individual Item Savings */}
      {savings.length > 0 && (
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/90 to-green-50/50 dark:from-white/10 dark:to-green-950/20 border border-green-200/30 dark:border-green-800/20 rounded-2xl p-6 shadow-lg">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-green-700 dark:text-green-300 flex items-center gap-2 mb-2">
              <DollarSign className="w-6 h-6" />
              Savings Opportunities
            </h3>
            <p className="text-sm text-muted-foreground">
              Cheaper alternatives found for {savings.length} item{savings.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex flex-row flex-wrap gap-4">
            {savings.map((item, index) => (
              <div
                key={index}
                className="flex-1 min-w-[320px] max-w-[500px] backdrop-blur-xl bg-gradient-to-br from-white/80 to-green-50/30 dark:from-white/5 dark:to-green-950/10 border border-green-200/30 dark:border-green-800/20 rounded-xl p-5 hover:border-green-300/50 dark:hover:border-green-700/40 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h4 className="font-semibold text-lg text-foreground">{item.itemName}</h4>
                      <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700">
                        {item.receiptQuantity}x
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 bg-white/50 dark:bg-white/5 rounded-lg p-3 border border-white/20">
                        <span className="text-muted-foreground">You paid:</span>
                        <span className="font-semibold text-lg text-foreground ml-auto">${item.receiptPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground bg-white/30 dark:bg-white/5 rounded-lg p-3 border border-white/20">
                        <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="font-medium">{item.alternativeMerchant}</span>
                        {item.alternativeLocation && (
                          <span className="text-xs ml-auto">({item.alternativeLocation})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg p-3 border border-green-300/40 dark:border-green-700/30">
                        <span className="text-green-700 dark:text-green-300">Price at {item.alternativeMerchant}:</span>
                        <span className="font-bold text-lg text-green-600 dark:text-green-400 ml-auto">
                          ${item.alternativePrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-6">
                    <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4 min-w-[100px]">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        -${item.savings.toFixed(2)}
                      </div>
                      <div className="text-xs text-green-600/70 dark:text-green-400/70 mt-1 font-medium">
                        {item.savingsPercentage}% off
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frequency-Based Savings */}
      {frequencySavings.length > 0 && (
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/90 to-emerald-50/50 dark:from-white/10 dark:to-emerald-950/20 border border-emerald-200/30 dark:border-emerald-800/20 rounded-2xl p-6 shadow-lg">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 mb-2">
              <TrendingDown className="w-6 h-6" />
              Long-term Savings Potential
            </h3>
            <p className="text-sm text-muted-foreground">
              Items you buy frequently - potential annual savings
            </p>
          </div>
          <div className="flex flex-row flex-wrap gap-4">
            {frequencySavings.map((item, index) => (
              <div
                key={index}
                className="flex-1 min-w-[320px] max-w-[500px] backdrop-blur-xl bg-gradient-to-br from-white/80 to-emerald-50/30 dark:from-white/5 dark:to-emerald-950/10 border border-emerald-200/30 dark:border-emerald-800/20 rounded-xl p-5 hover:border-emerald-300/50 dark:hover:border-emerald-700/40 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h4 className="font-semibold text-lg text-foreground">{item.itemName}</h4>
                      <Badge variant="secondary" className="text-xs bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700">
                        Bought {item.frequency} times
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 bg-white/50 dark:bg-white/5 rounded-lg p-3 border border-white/20">
                        <span className="text-muted-foreground">Current avg:</span>
                        <span className="font-semibold text-foreground ml-auto">${item.currentAvgPrice}</span>
                        <span className="text-muted-foreground mx-2">→</span>
                        <span className="text-muted-foreground">Cheaper:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">${item.cheaperPrice}</span>
                      </div>
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-lg p-3 border border-emerald-300/40 dark:border-emerald-700/30">
                        <span className="text-emerald-700 dark:text-emerald-300">Monthly savings:</span>
                        <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400 ml-auto float-right">${item.monthlySavings}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-6">
                    <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-xl p-4 min-w-[120px]">
                      <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        ${item.annualSavings}/yr
                      </div>
                      <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1 font-medium">potential</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

