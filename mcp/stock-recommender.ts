/**
 * Stock Recommender based on News Sentiment Analysis
 * Analyzes stock news from X API and generates buy/hold/sell recommendations
 */

import { XNewsItem } from '@/app/api/x-api/route'
import { StockRecommendation, NewsSentiment } from './types'

/**
 * Extract stock symbols from news text
 * Looks for common patterns like $AAPL, AAPL, or company names
 */
function extractStockSymbols(text: string): string[] {
  const symbols: string[] = []
  
  // Match $SYMBOL pattern (e.g., $AAPL, $TSLA)
  const dollarSymbols = text.match(/\$[A-Z]{1,5}\b/g)
  if (dollarSymbols) {
    symbols.push(...dollarSymbols.map(s => s.substring(1).toUpperCase()))
  }
  
  // Match uppercase symbols (e.g., AAPL, TSLA, MSFT)
  const uppercaseSymbols = text.match(/\b[A-Z]{2,5}\b/g)
  if (uppercaseSymbols) {
    // Filter out common words that aren't stock symbols
    const commonWords = ['NYSE', 'NASDAQ', 'S&P', 'IPO', 'CEO', 'CFO', 'AI', 'API', 'USD', 'GDP', 'ETF']
    symbols.push(...uppercaseSymbols.filter(s => !commonWords.includes(s)))
  }
  
  // Common company name mappings
  const companyMappings: Record<string, string> = {
    'apple': 'AAPL',
    'microsoft': 'MSFT',
    'google': 'GOOGL',
    'alphabet': 'GOOGL',
    'amazon': 'AMZN',
    'tesla': 'TSLA',
    'meta': 'META',
    'facebook': 'META',
    'nvidia': 'NVDA',
    'netflix': 'NFLX',
    'disney': 'DIS',
    'walmart': 'WMT',
    'jpmorgan': 'JPM',
    'bank of america': 'BAC',
    'goldman sachs': 'GS',
    'morgan stanley': 'MS',
    'visa': 'V',
    'mastercard': 'MA',
    'paypal': 'PYPL',
    'intel': 'INTC',
    'amd': 'AMD',
    'coca cola': 'KO',
    'pepsi': 'PEP',
    'mcdonalds': 'MCD',
    'starbucks': 'SBUX',
  }
  
  const lowerText = text.toLowerCase()
  for (const [company, symbol] of Object.entries(companyMappings)) {
    if (lowerText.includes(company)) {
      symbols.push(symbol)
    }
  }
  
  // Remove duplicates and return
  return Array.from(new Set(symbols))
}

/**
 * Analyze sentiment of news text
 * Simple keyword-based sentiment analysis
 */
function analyzeSentiment(text: string): NewsSentiment['sentiment'] {
  const lowerText = text.toLowerCase()
  
  const positiveKeywords = [
    'surge', 'rally', 'gain', 'up', 'rise', 'soar', 'jump', 'boost', 'growth',
    'profit', 'earnings beat', 'beat expectations', 'outperform', 'bullish',
    'buy', 'upgrade', 'strong', 'positive', 'optimistic', 'record', 'high'
  ]
  
  const negativeKeywords = [
    'drop', 'fall', 'decline', 'down', 'plunge', 'crash', 'loss', 'miss',
    'missed expectations', 'underperform', 'bearish', 'sell', 'downgrade',
    'weak', 'negative', 'pessimistic', 'low', 'concern', 'risk', 'warning'
  ]
  
  let positiveScore = 0
  let negativeScore = 0
  
  positiveKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) positiveScore++
  })
  
  negativeKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) negativeScore++
  })
  
  if (positiveScore > negativeScore) return 'positive'
  if (negativeScore > positiveScore) return 'negative'
  return 'neutral'
}

/**
 * Calculate sentiment score (-1 to 1)
 */
function calculateSentimentScore(text: string): number {
  const lowerText = text.toLowerCase()
  
  const positiveKeywords = [
    'surge', 'rally', 'gain', 'up', 'rise', 'soar', 'jump', 'boost', 'growth',
    'profit', 'earnings beat', 'beat expectations', 'outperform', 'bullish',
    'buy', 'upgrade', 'strong', 'positive', 'optimistic', 'record', 'high'
  ]
  
  const negativeKeywords = [
    'drop', 'fall', 'decline', 'down', 'plunge', 'crash', 'loss', 'miss',
    'missed expectations', 'underperform', 'bearish', 'sell', 'downgrade',
    'weak', 'negative', 'pessimistic', 'low', 'concern', 'risk', 'warning'
  ]
  
  let positiveScore = 0
  let negativeScore = 0
  
  positiveKeywords.forEach(keyword => {
    const matches = (lowerText.match(new RegExp(keyword, 'gi')) || []).length
    positiveScore += matches
  })
  
  negativeKeywords.forEach(keyword => {
    const matches = (lowerText.match(new RegExp(keyword, 'gi')) || []).length
    negativeScore += matches
  })
  
  const total = positiveScore + negativeScore
  if (total === 0) return 0
  
  return (positiveScore - negativeScore) / total
}

/**
 * Generate stock recommendations from news items
 */
export function generateStockRecommendations(newsItems: XNewsItem[]): StockRecommendation[] {
  const stockNewsMap = new Map<string, { news: XNewsItem[], sentiments: NewsSentiment[] }>()
  
  // Group news by stock symbol
  newsItems.forEach(news => {
    if (news.type !== 'stock') return
    
    const symbols = extractStockSymbols(news.text)
    
    symbols.forEach(symbol => {
      if (!stockNewsMap.has(symbol)) {
        stockNewsMap.set(symbol, { news: [], sentiments: [] })
      }
      
      const entry = stockNewsMap.get(symbol)!
      entry.news.push(news)
      
      const sentiment = analyzeSentiment(news.text)
      const score = calculateSentimentScore(news.text)
      
      entry.sentiments.push({
        newsId: news.id,
        symbol,
        sentiment,
        score,
        keywords: extractStockSymbols(news.text)
      })
    })
  })
  
  // Generate recommendations for each stock
  const recommendations: StockRecommendation[] = []
  
  stockNewsMap.forEach((data, symbol) => {
    // Calculate aggregate sentiment
    const avgScore = data.sentiments.reduce((sum, s) => sum + s.score, 0) / data.sentiments.length
    const positiveCount = data.sentiments.filter(s => s.sentiment === 'positive').length
    const negativeCount = data.sentiments.filter(s => s.sentiment === 'negative').length
    const neutralCount = data.sentiments.filter(s => s.sentiment === 'neutral').length
    
    // Determine recommendation
    let recommendation: 'buy' | 'hold' | 'sell'
    let confidence: number
    let reasoning: string
    
    if (avgScore > 0.3 && positiveCount > negativeCount) {
      recommendation = 'buy'
      confidence = Math.min(95, 50 + (avgScore * 30) + (positiveCount * 5))
      reasoning = `Strong positive sentiment with ${positiveCount} positive news items. Recent news suggests upward momentum.`
    } else if (avgScore < -0.3 && negativeCount > positiveCount) {
      recommendation = 'sell'
      confidence = Math.min(95, 50 + (Math.abs(avgScore) * 30) + (negativeCount * 5))
      reasoning = `Negative sentiment with ${negativeCount} negative news items. Recent developments suggest caution.`
    } else {
      recommendation = 'hold'
      confidence = Math.min(85, 40 + (Math.abs(avgScore) * 20))
      reasoning = `Mixed sentiment with ${positiveCount} positive, ${negativeCount} negative, and ${neutralCount} neutral news items. Monitor closely.`
    }
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high'
    const newsCount = data.news.length
    if (newsCount < 3) {
      riskLevel = 'high' // Not enough data
    } else if (Math.abs(avgScore) > 0.5) {
      riskLevel = 'high' // High volatility in sentiment
    } else if (newsCount >= 5 && Math.abs(avgScore) < 0.3) {
      riskLevel = 'low'
    } else {
      riskLevel = 'medium'
    }
    
    recommendations.push({
      symbol,
      companyName: symbol, // Will be enriched by research if available
      recommendation,
      confidence: Math.round(confidence),
      reasoning,
      newsItems: data.news.map(n => n.id),
      riskLevel
    })
  })
  
  // Sort by confidence (highest first)
  return recommendations.sort((a, b) => b.confidence - a.confidence)
}

