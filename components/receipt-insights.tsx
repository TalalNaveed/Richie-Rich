"use client"
import { ArrowLeft, TrendingDown, Sparkles } from "lucide-react"

interface ReceiptInsightsProps {
  onBack: () => void
}

export function ReceiptInsights({ onBack }: ReceiptInsightsProps) {
  const mockInsights = [
    {
      item: "Sunflower Oil (1L)",
      receiptPrice: 3.5,
      onlinePrice: 3.4,
      source: "Walmart.com",
    },
    {
      item: "Organic Spinach (200g)",
      receiptPrice: 4.99,
      onlinePrice: 4.49,
      source: "Instacart",
    },
    {
      item: "Greek Yogurt (500g)",
      receiptPrice: 5.99,
      onlinePrice: 5.49,
      source: "Amazon Fresh",
    },
  ]

  const totalSavings = mockInsights.reduce((sum, item) => sum + (item.receiptPrice - item.onlinePrice), 0)

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Header Section */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/90 to-green-50/50 dark:from-white/10 dark:to-green-950/20 border border-green-200/30 dark:border-green-800/20 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-green-700 dark:text-green-300 flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              Receipt Analysis
            </h2>
            <p className="text-muted-foreground mt-2">Smart price comparison results</p>
          </div>
          <div className="text-center bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-6 min-w-[140px]">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">${totalSavings.toFixed(2)}</div>
            <p className="text-sm text-green-600/70 dark:text-green-400/70 mt-1">Total savings</p>
          </div>
        </div>
      </div>

      {/* Price Comparison Cards */}
      <div className="space-y-4">
        {mockInsights.map((insight, idx) => {
          const savings = insight.receiptPrice - insight.onlinePrice
          const savingsPercent = ((savings / insight.receiptPrice) * 100).toFixed(1)
          
          return (
            <div
              key={idx}
              className="backdrop-blur-xl bg-gradient-to-br from-white/90 to-green-50/30 dark:from-white/10 dark:to-green-950/10 border border-green-200/30 dark:border-green-800/20 rounded-xl p-5 hover:border-green-300/50 dark:hover:border-green-700/40 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="font-semibold text-lg text-foreground mb-1">{insight.item}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-md">Source: {insight.source}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-base font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-1.5 rounded-lg">
                    <TrendingDown className="w-4 h-4" />
                    Save ${savings.toFixed(2)}
                  </div>
                  <span className="text-xs text-green-600/70 dark:text-green-400/70">{savingsPercent}% off</span>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-4 border-t border-green-200/30 dark:border-green-800/20">
                <div className="flex-1 bg-white/50 dark:bg-white/5 rounded-lg p-4 border border-white/20">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Your Receipt</p>
                  <p className="text-2xl font-bold text-foreground">${insight.receiptPrice.toFixed(2)}</p>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="text-2xl text-green-500 dark:text-green-400">→</div>
                  <div className="text-xs text-muted-foreground font-medium">Save</div>
                </div>

                <div className="flex-1 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg p-4 border border-green-300/40 dark:border-green-700/30">
                  <p className="text-xs text-green-700 dark:text-green-300 mb-2 font-medium">Online Price</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">${insight.onlinePrice.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Action Button */}
      <button
        onClick={onBack}
        className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-500 dark:to-emerald-500 text-white rounded-xl font-semibold hover:shadow-xl hover:scale-[1.02] transition-all duration-300 mt-8"
      >
        <ArrowLeft className="w-5 h-5" />
        Compare Another Receipt
      </button>
    </div>
  )
}
