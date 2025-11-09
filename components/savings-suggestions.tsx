"use client"

import { useState, useEffect } from "react"
import { AlertCircle, TrendingDown, MapPin, DollarSign, Sparkles } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Finding Savings Opportunities...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (savings.length === 0 && frequencySavings.length === 0) {
    return null
  }

  const hasImmediateSavings = savings.length > 0 && parseFloat(totalSavings) > 0

  return (
    <div className="mt-4 space-y-4">
      {/* Immediate Savings Alert */}
      {hasImmediateSavings && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-800 dark:text-green-200">
            💰 Potential Savings Found!
          </AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            You could save <strong>${totalSavings}</strong> on this purchase by shopping at different stores!
          </AlertDescription>
        </Alert>
      )}

      {/* Individual Item Savings */}
      {savings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Savings Opportunities
            </CardTitle>
            <CardDescription>
              Cheaper alternatives found for {savings.length} item{savings.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {savings.map((item, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{item.itemName}</h4>
                        <Badge variant="outline" className="text-xs">
                          {item.receiptQuantity}x
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>You paid:</span>
                          <span className="font-medium text-foreground">${item.receiptPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          <span>{item.alternativeMerchant}</span>
                          {item.alternativeLocation && (
                            <span className="text-xs">({item.alternativeLocation})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Price at {item.alternativeMerchant}:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            ${item.alternativePrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        -${item.savings.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.savingsPercentage}% off
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Frequency-Based Savings */}
      {frequencySavings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-primary" />
              Long-term Savings Potential
            </CardTitle>
            <CardDescription>
              Items you buy frequently - potential annual savings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {frequencySavings.map((item, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{item.itemName}</h4>
                        <Badge variant="secondary" className="text-xs">
                          Bought {item.frequency} times
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>
                          Current avg: <span className="font-medium">${item.currentAvgPrice}</span> → 
                          Cheaper: <span className="font-medium text-green-600 dark:text-green-400">${item.cheaperPrice}</span>
                        </div>
                        <div>
                          Monthly savings: <span className="font-medium text-green-600 dark:text-green-400">${item.monthlySavings}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        ${item.annualSavings}/yr
                      </div>
                      <div className="text-xs text-muted-foreground">potential</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

