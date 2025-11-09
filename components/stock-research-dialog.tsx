"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  AlertCircle,
  DollarSign,
  BarChart3,
  TrendingUp as UpIcon,
  TrendingDown as DownIcon,
} from "lucide-react"
import { StockResearch } from "@/mcp/types"

interface StockResearchDialogProps {
  symbol: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StockResearchDialog({
  symbol,
  open,
  onOpenChange,
}: StockResearchDialogProps) {
  const [research, setResearch] = useState<StockResearch | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && symbol) {
      fetchResearch()
    } else {
      // Reset state when dialog closes
      setResearch(null)
      setError(null)
    }
  }, [open, symbol])

  const fetchResearch = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`http://localhost:8000/api/research/${symbol}`, {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch research")
      }

      const data = await response.json()
      setResearch(data)
    } catch (err) {
      console.error("Error fetching research:", err)
      setError(err instanceof Error ? err.message : "Failed to load research")
    } finally {
      setLoading(false)
    }
  }

  const getRecommendationIcon = (action: string) => {
    switch (action) {
      case "buy":
        return <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
      case "sell":
        return <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
      default:
        return <Minus className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
    }
  }

  const getRecommendationColor = (action: string) => {
    switch (action) {
      case "buy":
        return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
      case "sell":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
      default:
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
    }
  }

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : ""
    return `${sign}${value.toFixed(2)}%`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Deep Research: {symbol.toUpperCase()}
          </DialogTitle>
          <DialogDescription>
            Comprehensive analysis using MCP Sonar
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchResearch} variant="outline">
                Retry Research
              </Button>
            </div>
          ) : research ? (
            <div className="space-y-6">
              {/* Company Info */}
              <div className="p-4 rounded-lg border bg-card">
                <h3 className="font-semibold text-lg mb-2">{research.companyName}</h3>
                {research.currentPrice && (
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-2xl font-bold">${research.currentPrice.toFixed(2)}</span>
                      {research.priceChange && (
                        <span
                          className={`ml-2 text-sm ${
                            research.priceChange.percent >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {formatPercent(research.priceChange.percent)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Recommendation */}
              {research.recommendation && (
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getRecommendationIcon(research.recommendation.action)}
                      <h3 className="font-semibold">Investment Recommendation</h3>
                    </div>
                    <Badge
                      className={`${getRecommendationColor(
                        research.recommendation.action
                      )} flex items-center gap-1`}
                    >
                      {research.recommendation.action.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Confidence: {research.recommendation.confidence}%
                  </p>
                  <p className="text-sm">{research.recommendation.reasoning}</p>
                  {research.recommendation.priceTarget && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Price Target: ${research.recommendation.priceTarget.toFixed(2)} ({research.recommendation.timeHorizon})
                    </p>
                  )}
                </div>
              )}

              {/* Historical Performance */}
              {research.historicalPerformance && (
                <div className="p-4 rounded-lg border bg-card">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Historical Performance
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">1 Year</p>
                      <p
                        className={`text-lg font-semibold ${
                          research.historicalPerformance.oneYear >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {formatPercent(research.historicalPerformance.oneYear)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">3 Years</p>
                      <p
                        className={`text-lg font-semibold ${
                          research.historicalPerformance.threeYears >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {formatPercent(research.historicalPerformance.threeYears)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">5 Years</p>
                      <p
                        className={`text-lg font-semibold ${
                          research.historicalPerformance.fiveYears >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {formatPercent(research.historicalPerformance.fiveYears)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Metrics */}
              {research.financialMetrics && Object.keys(research.financialMetrics).length > 0 && (
                <div className="p-4 rounded-lg border bg-card">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Financial Metrics
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {research.financialMetrics.revenue && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                        <p className="text-sm font-semibold">{research.financialMetrics.revenue}</p>
                      </div>
                    )}
                    {research.financialMetrics.netIncome && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Net Income</p>
                        <p className="text-sm font-semibold">{research.financialMetrics.netIncome}</p>
                      </div>
                    )}
                    {research.financialMetrics.earningsPerShare && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">EPS</p>
                        <p className="text-sm font-semibold">${research.financialMetrics.earningsPerShare.toFixed(2)}</p>
                      </div>
                    )}
                    {research.peRatio && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">P/E Ratio</p>
                        <p className="text-sm font-semibold">{research.peRatio.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Analyst Ratings */}
              {research.analystRatings && (
                <div className="p-4 rounded-lg border bg-card">
                  <h3 className="font-semibold mb-3">Analyst Ratings</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Buy</p>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {research.analystRatings.buy}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Hold</p>
                      <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                        {research.analystRatings.hold}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Sell</p>
                      <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                        {research.analystRatings.sell}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Avg Rating</p>
                      <p className="text-lg font-semibold">
                        {research.analystRatings.averageRating.toFixed(1)}/5
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Factors */}
              {research.riskFactors && research.riskFactors.length > 0 && (
                <div className="p-4 rounded-lg border bg-card border-red-500/20">
                  <h3 className="font-semibold mb-3 text-red-600 dark:text-red-400">
                    Risk Factors
                  </h3>
                  <ul className="space-y-2">
                    {research.riskFactors.map((risk, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Opportunities */}
              {research.opportunities && research.opportunities.length > 0 && (
                <div className="p-4 rounded-lg border bg-card border-green-500/20">
                  <h3 className="font-semibold mb-3 text-green-600 dark:text-green-400">
                    Opportunities
                  </h3>
                  <ul className="space-y-2">
                    {research.opportunities.map((opp, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <UpIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{opp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recent News */}
              {research.recentNews && research.recentNews.length > 0 && (
                <div className="p-4 rounded-lg border bg-card">
                  <h3 className="font-semibold mb-3">Recent News</h3>
                  <div className="space-y-3">
                    {research.recentNews.map((news, idx) => (
                      <div key={idx} className="text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={
                              news.sentiment === "positive"
                                ? "default"
                                : news.sentiment === "negative"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {news.sentiment}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{news.date}</span>
                        </div>
                        <p className="font-medium">{news.title}</p>
                        <p className="text-xs text-muted-foreground">{news.source}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground text-center pt-4 border-t">
                {research.cached && (
                  <Badge variant="outline" className="mb-2">
                    Cached Result
                  </Badge>
                )}
                <div>Research completed: {new Date(research.researchDate).toLocaleString()}</div>
              </div>
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

