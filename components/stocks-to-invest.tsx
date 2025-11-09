"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, Search, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { StockResearchDialog } from "./stock-research-dialog"

interface RecommendedStock {
  symbol: string
  companyName: string
  reason: string
}

interface StocksToInvestData {
  dateGenerated: string
  recommendedStocks: RecommendedStock[]
  cached?: boolean
  error?: string
}

export function StocksToInvest() {
  const [stocks, setStocks] = useState<RecommendedStock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [researchSymbol, setResearchSymbol] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isCached, setIsCached] = useState(false)

  const fetchStocks = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("http://localhost:8000/api/stocks-to-invest", {
        cache: "no-store",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch recommended stocks")
      }

      const data: StocksToInvestData = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      setStocks(data.recommendedStocks || [])
      setLastUpdated(new Date(data.dateGenerated))
      setIsCached(data.cached || false)
    } catch (err) {
      console.error("Error fetching stocks:", err)
      setError(err instanceof Error ? err.message : "Failed to load recommended stocks")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStocks()
    // Refresh every 10 minutes
    const interval = setInterval(fetchStocks, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date)
  }

  if (loading && stocks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stocks to Invest
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stocks to Invest
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchStocks} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (stocks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stocks to Invest
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No recommended stocks available. Check back later for updates.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Stocks to Invest
              <Badge variant="secondary" className="ml-2">
                {stocks.length}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchStocks}
                disabled={loading}
                className="h-8"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
              Updated {formatTime(lastUpdated)}
              {isCached && <Badge variant="outline" className="text-xs">Cached</Badge>}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stocks.map((stock, index) => (
              <div
                key={`${stock.symbol}-${index}`}
                className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{stock.symbol}</h3>
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {stock.companyName}
                    </p>
                    <p className="text-sm text-foreground">
                      {stock.reason}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setResearchSymbol(stock.symbol)}
                    className="flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Deep Research
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {researchSymbol && (
        <StockResearchDialog
          symbol={researchSymbol}
          open={!!researchSymbol}
          onOpenChange={(open) => !open && setResearchSymbol(null)}
        />
      )}
    </>
  )
}

