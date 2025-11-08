"use client"
import { ArrowLeft, TrendingDown } from "lucide-react"

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Receipt Analysis</h2>
          <p className="text-muted-foreground mt-1">Smart price comparison results</p>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">${totalSavings.toFixed(2)}</div>
          <p className="text-sm text-muted-foreground">Total savings</p>
        </div>
      </div>

      {/* Price Comparison Cards */}
      <div className="space-y-3">
        {mockInsights.map((insight, idx) => (
          <div
            key={idx}
            className="backdrop-blur-lg bg-white/40 dark:bg-white/5 border border-white/20 rounded-xl p-4 hover:border-primary/50 transition-all duration-300 group"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-foreground">{insight.item}</p>
                <p className="text-xs text-muted-foreground mt-1">Source: {insight.source}</p>
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-lg">
                <TrendingDown className="w-4 h-4" />
                Save ${(insight.receiptPrice - insight.onlinePrice).toFixed(2)}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Your Receipt</p>
                <p className="text-lg font-bold text-foreground">${insight.receiptPrice.toFixed(2)}</p>
              </div>

              <div className="text-center text-muted-foreground">→</div>

              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Online Price</p>
                <p className="text-lg font-bold text-primary">${insight.onlinePrice.toFixed(2)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <button
        onClick={onBack}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-lg font-medium hover:shadow-lg transition-all duration-300 mt-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Compare Another Receipt
      </button>
    </div>
  )
}
