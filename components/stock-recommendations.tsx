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
      <Card className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border-white/20 dark:border-white/10 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            Stock Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-5 rounded-xl border bg-card space-y-3">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border-white/20 dark:border-white/10 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            Stock Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">Failed to load recommendations</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
            <Button
              variant="outline"
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
      <Card className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border-white/20 dark:border-white/10 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            Stock Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              No stock recommendations available. Check back later for updates based on recent news.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border-white/20 dark:border-white/10 shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              Stock Recommendations
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm font-semibold px-3 py-1">
                {recommendations.length} Stocks
              </Badge>
              {isCached && (
                <Badge variant="outline" className="text-xs">
                  Cached
                </Badge>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Top investment opportunities powered by Dedalus MCP with real-time market analysis
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec, index) => (
              <div
                key={rec.symbol}
                className="group relative p-5 rounded-xl border-2 bg-gradient-to-br from-card to-muted/30 hover:from-card hover:to-muted/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {/* Recommendation Badge */}
                <div className="absolute top-3 right-3">
                  <Badge
                    className={`${getRecommendationColor(
                      rec.recommendation
                    )} flex items-center gap-1.5 px-3 py-1 font-semibold shadow-sm`}
                  >
                    {getRecommendationIcon(rec.recommendation)}
                    {rec.recommendation.toUpperCase()}
                  </Badge>
                </div>

                {/* Stock Symbol and Company */}
                <div className="mb-4 pr-24">
                  <div className="flex items-baseline gap-2 mb-1">
                    <h3 className="font-bold text-2xl text-foreground">{rec.symbol}</h3>
                    <span className="text-xs text-muted-foreground">#{index + 1}</span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {rec.companyName}
                  </p>
                </div>

                {/* Confidence and Risk */}
                <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500"
                          style={{ width: `${rec.confidence}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-foreground min-w-[3rem]">
                        {rec.confidence}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xs text-muted-foreground mb-1">Risk Level</p>
                    <Badge
                      variant="outline"
                      className={`${getRiskColor(rec.riskLevel)} border-current font-semibold`}
                    >
                      {rec.riskLevel.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {/* Reasoning */}
                <p className="text-sm text-foreground/80 mb-4 line-clamp-2 leading-relaxed">
                  {rec.reasoning}
                </p>

                {/* Action Button */}
                <div className="pt-3 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setResearchSymbol(rec.symbol)}
                    className="w-full flex items-center justify-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
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

