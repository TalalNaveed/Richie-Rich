/**
 * Type definitions for stock recommendation and research
 */

export interface StockRecommendation {
  symbol: string
  companyName: string
  recommendation: 'buy' | 'hold' | 'sell'
  confidence: number // 0-100
  reasoning: string
  newsItems: string[] // IDs of news items that influenced this recommendation
  priceTarget?: number
  riskLevel: 'low' | 'medium' | 'high'
}

export interface StockResearch {
  symbol: string
  companyName: string
  currentPrice?: number
  priceChange?: {
    value: number
    percent: number
  }
  marketCap?: string
  peRatio?: number
  dividendYield?: number
  historicalPerformance: {
    oneYear: number
    threeYears: number
    fiveYears: number
  }
  financialMetrics: {
    revenue?: string
    netIncome?: string
    earningsPerShare?: number
    debtToEquity?: number
  }
  analystRatings: {
    buy: number
    hold: number
    sell: number
    averageRating: number // 1-5 scale
  }
  recentNews: Array<{
    title: string
    date: string
    source: string
    sentiment: 'positive' | 'neutral' | 'negative'
  }>
  riskFactors: string[]
  opportunities: string[]
  recommendation: {
    action: 'buy' | 'hold' | 'sell'
    confidence: number
    reasoning: string
    priceTarget?: number
    timeHorizon: string
  }
  researchDate: string
  cached?: boolean
}

export interface NewsSentiment {
  newsId: string
  symbol: string
  sentiment: 'positive' | 'neutral' | 'negative'
  score: number // -1 to 1
  keywords: string[]
}

