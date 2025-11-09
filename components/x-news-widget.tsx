"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, ShoppingBag, X as XIcon, RefreshCw, ExternalLink, CheckCircle2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export interface XNewsItem {
  id: string
  text: string
  author: string
  authorName?: string
  timestamp: string
  type: "deal" | "stock"
  url: string
  verified?: boolean
}

export function XNewsWidget() {
  const [news, setNews] = useState<XNewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMinimized, setIsMinimized] = useState(true) // Start minimized
  const [activeTab, setActiveTab] = useState<"all" | "deals" | "stocks">("all")

  const fetchNews = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/x-api?type=${activeTab}`, {
        cache: "no-store",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.details || `HTTP ${response.status}: Failed to fetch news`
        console.error("X API Error:", errorMessage, errorData)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log("Fetched news data:", data.length, "items")
      setNews(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Error fetching X news:", err)
      setError(err instanceof Error ? err.message : "Failed to load news")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNews()
    // Refresh every 5 minutes
    const interval = setInterval(fetchNews, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [activeTab])

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch {
      return "Recently"
    }
  }

  const truncateText = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + "..."
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-primary text-primary-foreground rounded-lg p-3 shadow-lg hover:bg-primary/90 transition-colors flex items-center gap-2 group"
          aria-label="Expand news widget"
        >
          <TrendingUp className="h-5 w-5" />
          <span className="text-sm font-medium hidden sm:inline group-hover:inline">News & Deals</span>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]">
      <Card className="shadow-2xl border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              News & Deals
            </CardTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchNews}
                disabled={loading}
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
                aria-label="Refresh news"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
                aria-label="Minimize widget"
                title="Minimize"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                activeTab === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab("deals")}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1 ${
                activeTab === "deals"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              <ShoppingBag className="h-3 w-3" />
              Deals
            </button>
            <button
              onClick={() => setActiveTab("stocks")}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1 ${
                activeTab === "stocks"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              <TrendingUp className="h-3 w-3" />
              Stocks
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="px-4 pb-4 space-y-3">
              {loading && news.length === 0 ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              ) : error ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">{error}</p>
                  <button
                    onClick={fetchNews}
                    className="mt-2 text-xs text-primary hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : news.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No news available at the moment.</p>
                </div>
              ) : (
                news
                  .filter((item) => {
                    if (activeTab === "all") return true
                    if (activeTab === "deals") return item.type === "deal"
                    if (activeTab === "stocks") return item.type === "stock"
                    return true
                  })
                  .map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors hover:border-primary/50 group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge
                          variant={item.type === "deal" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {item.type === "deal" ? (
                            <>
                              <ShoppingBag className="h-3 w-3 mr-1" />
                              Deal
                            </>
                          ) : (
                            <>
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Stock
                            </>
                          )}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(item.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mb-3 leading-relaxed">
                        {truncateText(item.text)}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center gap-1.5">
                          {item.authorName && (
                            <>
                              <span className="text-xs font-medium text-foreground">
                                {item.authorName}
                              </span>
                              {item.verified && (
                                <CheckCircle2 className="h-3 w-3 text-blue-500 fill-blue-500" />
                              )}
                              <span className="text-xs text-muted-foreground">·</span>
                            </>
                          )}
                          <span className="text-xs text-muted-foreground">@{item.author}</span>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </a>
                  ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

