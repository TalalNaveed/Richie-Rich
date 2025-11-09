"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown, Minus, Search, Loader2, AlertCircle } from "lucide-react"
import { StockRecommendation } from "@/mcp/types"
import { StockResearchDialog } from "./stock-research-dialog"

export function StockRecommendations() {
  const [recommendations, setRecommendations] = useState<StockRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [researchSymbol, setResearchSymbol] = useState<string | null>(null)
  const [isCached, setIsCached] = useState(false)

  const fetchRecommendations = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/stocks/recommendations", {
        cache: "no-store",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch recommendations")
      }

      const data = await response.json()
      setRecommendations(data.recommendations || [])
      setIsCached(data.cached || false)
    } catch (err) {
      console.error("Error fetching recommendations:", err)
      setError(err instanceof Error ? err.message : "Failed to load recommendations")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecommendations()
    // Refresh every 10 minutes
    const interval = setInterval(fetchRecommendations, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case "buy":
        return <TrendingUp className="h-4 w-4" />
      case "sell":
        return <TrendingDown className="h-4 w-4" />
      default:
        return <Minus className="h-4 w-4" />
    }
  }

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case "buy":
        return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
      case "sell":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
      default:
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "text-green-600 dark:text-green-400"
      case "high":
        return "text-red-600 dark:text-red-400"
      default:
        return "text-yellow-600 dark:text-yellow-400"
    }
  }

  if (loading && recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stock Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
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
            Stock Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchRecommendations}
              className="ml-auto"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stock Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No stock recommendations available. Check back later for updates based on recent news.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stock Recommendations
            <Badge variant="secondary" className="ml-auto">
              {recommendations.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Top 10 stocks to invest in - Powered by Dedalus MCP
            </p>
            {isCached && (
              <Badge variant="outline" className="text-xs">
                Cached
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div
                key={rec.symbol}
                className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{rec.symbol}</h3>
                      <Badge
                        className={`${getRecommendationColor(
                          rec.recommendation
                        )} flex items-center gap-1`}
                      >
                        {getRecommendationIcon(rec.recommendation)}
                        {rec.recommendation.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {rec.companyName}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {rec.confidence}% confidence
                    </div>
                    <div
                      className={`text-xs ${getRiskColor(rec.riskLevel)}`}
                    >
                      {rec.riskLevel.toUpperCase()} risk
                    </div>
                  </div>
                </div>

                <p className="text-sm text-foreground mb-3">
                  {rec.reasoning}
                </p>

                <div className="flex items-center gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setResearchSymbol(rec.symbol)}
                    className="flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Learn More
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

