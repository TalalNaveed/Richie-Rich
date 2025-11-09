import { NextResponse } from "next/server"
import { Client } from "@xdevplatform/xdk"

export interface XTweet {
  id: string
  text: string
  author_id?: string
  created_at?: string
  public_metrics?: {
    retweet_count: number
    like_count: number
    reply_count: number
  }
  author?: {
    username: string
    name: string
  }
}

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

/**
 * X API route handler using XDK
 * Fetches deals and stock market news from X (Twitter) API
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "all" // "deals", "stocks", or "all"

  // Get X API credentials from environment variables
  let bearerToken = process.env.X_API_BEARER_TOKEN

  // Remove quotes if present (common .env issue)
  if (bearerToken) {
    bearerToken = bearerToken.replace(/^["']|["']$/g, "").trim()
  }

  if (!bearerToken) {
    console.error("X API Bearer Token is missing. Set X_API_BEARER_TOKEN environment variable.")
    return NextResponse.json(
      { 
        error: "X API Bearer Token is required. Set X_API_BEARER_TOKEN environment variable.",
        details: "Get your Bearer Token from: https://developer.twitter.com/en/portal/dashboard -> Your App -> Keys and tokens"
      },
      { status: 400 }
    )
  }

  console.log(`🔑 Using Bearer Token (length: ${bearerToken.length}, starts with: ${bearerToken.substring(0, 10)}...)`)

  // Validate Bearer Token format
  if (bearerToken.length < 50) {
    console.warn(`⚠️ Bearer Token seems too short (${bearerToken.length} chars). Valid tokens are usually 100+ characters.`)
  }
  if (bearerToken.includes(' ')) {
    console.warn(`⚠️ Bearer Token contains spaces - this may cause issues.`)
  }

  // Keywords that indicate stock/financial content
  const stockKeywords = [
    'stock', 'stocks', 'market', 'markets', 'trading', 'investing', 'investor', 'investment',
    'NYSE', 'NASDAQ', 'S&P', 'Dow', 'index', 'indices', 'equity', 'equities', 'shares',
    'earnings', 'revenue', 'profit', 'IPO', 'dividend', 'yield', 'portfolio', 'bull', 'bear',
    'rally', 'crash', 'correction', 'volatility', 'sector', 'analyst', 'forecast', 'outlook',
    'financial', 'finance', 'banking', 'economy', 'economic', 'GDP', 'inflation', 'Fed', 'Federal Reserve',
    'bond', 'bonds', 'treasury', 'commodity', 'futures', 'options', 'crypto', 'bitcoin', 'ethereum',
    'merger', 'acquisition', 'deal', 'IPO', 'public offering'
  ]

  // Keywords that indicate deal/shopping content
  const dealKeywords = [
    'sale', 'deal', 'deals', 'discount', 'save', 'savings', 'promo', 'promotion', 'coupon',
    'amazon', 'walmart', 'target', 'costco', 'bestbuy', 'retail', 'shopping', 'price', 'prices',
    'off', 'percent', '%', 'free shipping', 'limited time', 'today only', 'flash sale'
  ]

  /**
   * Check if tweet text is related to stocks/finance
   */
  const isStockRelated = (text: string): boolean => {
    const lowerText = text.toLowerCase()
    return stockKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()))
  }

  /**
   * Check if tweet text is related to deals/shopping
   */
  const isDealRelated = (text: string): boolean => {
    const lowerText = text.toLowerCase()
    return dealKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()))
  }

  try {
    // Initialize XDK Client with Bearer Token
    const client = new Client({ bearerToken })
    const results: XNewsItem[] = []

    // Search queries for deals - loosened requirements, broader coverage
    // Note: Verified filtering happens in code since is:verified is not a valid search operator
    const dealQueries = [
      "(#AmazonDeals OR #WalmartDeals OR #TargetDeals OR #CostcoDeals) lang:en -is:retweet -is:reply",
      "(#Deals OR #Sale OR #Discount OR #Savings) lang:en -is:retweet -is:reply",
      "(amazon OR walmart OR target OR costco OR bestbuy) (sale OR discount OR save OR promo OR coupon OR deal OR savings) lang:en -is:retweet -is:reply",
      "#BlackFriday OR #CyberMonday OR #PrimeDay OR #DealAlert lang:en -is:retweet -is:reply",
      "(#ShoppingDeals OR #RetailDeals OR #DealOfTheDay) lang:en -is:retweet -is:reply",
      "(sale OR discount OR deal) (amazon OR walmart OR target) lang:en -is:retweet -is:reply",
      "(amazon OR walmart) lang:en -is:retweet -is:reply", // Very broad - just mentions retailers
    ]

    // Search queries for stock market news - from known financial sources and broader coverage
    // Note: Verified filtering happens in code since is:verified is not a valid search operator
    // Content filtering also happens in code to ensure tweets are actually stock-related
    const stockQueries = [
      // From known financial news sources - with stock-related keywords
      "(from:Bloomberg OR from:WSJ OR from:CNBC OR from:FinancialTimes OR from:MarketWatch OR from:business) (stock OR stocks OR market OR markets OR trading OR investing OR earnings OR IPO OR S&P OR NASDAQ OR NYSE) lang:en -is:retweet -is:reply",
      // Hashtag-based searches (more reliable for stock content)
      "(#StockMarket OR #Stocks OR #Investing OR #Trading OR #Markets) lang:en -is:retweet -is:reply",
      "(#NYSE OR #NASDAQ OR #SP500 OR #DowJones) lang:en -is:retweet -is:reply",
      "#MarketNews OR #FinanceNews OR #StockNews lang:en -is:retweet -is:reply",
      // Market movements and financial terms
      "(stock market OR stocks OR investing OR trading OR markets OR equity OR equities) lang:en -is:retweet -is:reply",
      "(NYSE OR NASDAQ OR S&P 500 OR Dow Jones) lang:en -is:retweet -is:reply",
      "(market update OR market analysis OR stock news OR earnings OR revenue OR profit) lang:en -is:retweet -is:reply",
      // Price movements and trends
      "(stock price OR market rally OR market drop OR earnings OR IPO OR dividend) lang:en -is:retweet -is:reply",
      // Financial indicators
      "(Fed OR Federal Reserve OR inflation OR GDP OR economy OR economic) lang:en -is:retweet -is:reply",
    ]

    // Fetch deals if requested
    if (type === "deals" || type === "all") {
      // Use more queries for better coverage - increased to get more results
      for (const query of dealQueries.slice(0, type === "all" ? 5 : dealQueries.length)) {
        try {
          console.log(`\n📡 Deals API Request - Query: ${query}`)
          
          // Use XDK to search tweets - exclude retweets and replies, only verified accounts
          const response = await client.posts.searchRecent(query, {
            maxResults: 30, // Increased to get more results before filtering (verified accounts only)
            tweetfields: ["created_at", "author_id", "public_metrics", "referenced_tweets"],
            userfields: ["username", "name", "verified"],
            expansions: ["author_id"],
          })

          console.log(`✅ Deals API Response received`)
          console.log(`Response structure:`, {
            hasData: !!response.data,
            dataLength: response.data?.length || 0,
            hasIncludes: !!response.includes,
            hasUsers: !!response.includes?.users,
            usersLength: response.includes?.users?.length || 0,
            meta: response.meta,
            errors: response.errors
          })

          const tweets = response.data || []
          const users = response.includes?.users || []

          console.log(`Fetched ${tweets.length} deal tweets for query: ${query}`)

          // Create a user map
          const userMap = new Map(
            users.map((user: any) => [user.id, { 
              username: user.username, 
              name: user.name,
              verified: user.verified || false
            }])
          )

          tweets.forEach((tweet: any) => {
            // Skip if it's a retweet or reply (double check)
            if (tweet.referenced_tweets?.some((ref: any) => ref.type === "retweeted" || ref.type === "replied_to")) {
              return
            }

            const author = userMap.get(tweet.author_id) as { username: string; name: string; verified: boolean } | undefined
            
            // Only include verified accounts
            if (!author?.verified) {
              return
            }

            // Clean up text - remove RT prefixes and clean formatting
            let cleanText = tweet.text
            // Remove RT @username: prefix (case insensitive)
            cleanText = cleanText.replace(/^RT @\w+:\s*/i, "")
            // Remove multiple spaces
            cleanText = cleanText.replace(/\s+/g, " ")
            // Remove leading/trailing whitespace
            cleanText = cleanText.trim()

            // Filter: Only include if tweet is actually about deals/shopping
            if (!isDealRelated(cleanText)) {
              console.log(`⏭️ Skipping deal tweet (not deal-related): ${cleanText.substring(0, 50)}...`)
              return
            }

            // Generate tweet URL
            const tweetUrl = `https://x.com/${author.username}/status/${tweet.id}`

            results.push({
              id: tweet.id,
              text: cleanText,
              author: author.username || "Unknown",
              authorName: author.name,
              timestamp: tweet.created_at || new Date().toISOString(),
              type: "deal",
              url: tweetUrl,
              verified: author.verified,
            })
          })
        } catch (err: any) {
          console.error(`❌ Error fetching deals for query "${query}":`, err)
          console.error(`Error details:`, {
            message: err.message,
            status: err.status,
            statusText: err.statusText,
            name: err.name,
            stack: err.stack?.substring(0, 500),
            data: err.data,
            response: err.response,
          })
          
          // Check for common errors - XDK might throw ApiError
          const status = err.status || err.response?.status || (err instanceof Error && 'status' in err ? (err as any).status : null)
          
          if (status === 401) {
            console.error("🔒 Authentication failed - Check your Bearer Token")
            console.error("Bearer Token info:", {
              length: bearerToken.length,
              startsWith: bearerToken.substring(0, 15),
              endsWith: bearerToken.substring(bearerToken.length - 10),
              hasSpaces: bearerToken.includes(' '),
              hasQuotes: bearerToken.includes('"') || bearerToken.includes("'"),
            })
          } else if (status === 403) {
            console.error("🚫 Access forbidden - Check app permissions (need 'Read' access)")
          } else if (status === 429) {
            console.error("⏱️ Rate limit exceeded - Wait before trying again")
          } else {
            console.error(`Unknown error status: ${status}`)
          }
        }
      }
    }

    // Fetch stock market news if requested
    if (type === "stocks" || type === "all") {
      // Use more queries for better coverage - increased to get more results
      for (const query of stockQueries.slice(0, type === "all" ? 5 : stockQueries.length)) {
        try {
          console.log(`\n📡 Stocks API Request - Query: ${query}`)
          
          // Use XDK to search tweets - exclude retweets and replies, only verified accounts
          const response = await client.posts.searchRecent(query, {
            maxResults: 30, // Increased to get more results before filtering (verified accounts only)
            tweetfields: ["created_at", "author_id", "public_metrics", "referenced_tweets"],
            userfields: ["username", "name", "verified"],
            expansions: ["author_id"],
          })

          console.log(`✅ Stocks API Response received`)
          console.log(`Response structure:`, {
            hasData: !!response.data,
            dataLength: response.data?.length || 0,
            hasIncludes: !!response.includes,
            hasUsers: !!response.includes?.users,
            usersLength: response.includes?.users?.length || 0,
            meta: response.meta,
            errors: response.errors
          })

          const tweets = response.data || []
          const users = response.includes?.users || []

          console.log(`Fetched ${tweets.length} stock tweets for query: ${query}`)

          // Create a user map
          const userMap = new Map(
            users.map((user: any) => [user.id, { 
              username: user.username, 
              name: user.name,
              verified: user.verified || false
            }])
          )

          tweets.forEach((tweet: any) => {
            // Skip if it's a retweet or reply (double check)
            if (tweet.referenced_tweets?.some((ref: any) => ref.type === "retweeted" || ref.type === "replied_to")) {
              return
            }

            const author = userMap.get(tweet.author_id) as { username: string; name: string; verified: boolean } | undefined
            
            // Only include verified accounts
            if (!author?.verified) {
              return
            }

            // Clean up text - remove RT prefixes and clean formatting
            let cleanText = tweet.text
            // Remove RT @username: prefix (case insensitive)
            cleanText = cleanText.replace(/^RT @\w+:\s*/i, "")
            // Remove multiple spaces
            cleanText = cleanText.replace(/\s+/g, " ")
            // Remove leading/trailing whitespace
            cleanText = cleanText.trim()

            // Filter: Only include if tweet is actually about stocks/finance
            if (!isStockRelated(cleanText)) {
              console.log(`⏭️ Skipping stock tweet (not stock-related): ${cleanText.substring(0, 50)}...`)
              return
            }

            // Generate tweet URL
            const tweetUrl = `https://x.com/${author.username}/status/${tweet.id}`

            results.push({
              id: tweet.id,
              text: cleanText,
              author: author.username || "Unknown",
              authorName: author.name,
              timestamp: tweet.created_at || new Date().toISOString(),
              type: "stock",
              url: tweetUrl,
              verified: author.verified,
            })
          })
        } catch (err: any) {
          console.error(`❌ Error fetching stocks for query "${query}":`, err)
          console.error(`Error details:`, {
            message: err.message,
            status: err.status,
            statusText: err.statusText,
            name: err.name,
            stack: err.stack?.substring(0, 500),
            data: err.data,
            response: err.response,
          })
          
          // Check for common errors - XDK might throw ApiError
          const status = err.status || err.response?.status || (err instanceof Error && 'status' in err ? (err as any).status : null)
          
          if (status === 401) {
            console.error("🔒 Authentication failed - Check your Bearer Token")
            console.error("Bearer Token info:", {
              length: bearerToken.length,
              startsWith: bearerToken.substring(0, 15),
              endsWith: bearerToken.substring(bearerToken.length - 10),
              hasSpaces: bearerToken.includes(' '),
              hasQuotes: bearerToken.includes('"') || bearerToken.includes("'"),
            })
          } else if (status === 403) {
            console.error("🚫 Access forbidden - Check app permissions (need 'Read' access)")
          } else if (status === 429) {
            console.error("⏱️ Rate limit exceeded - Wait before trying again")
          } else {
            console.error(`Unknown error status: ${status}`)
          }
        }
      }
    }

    // Remove duplicates and sort by timestamp (newest first)
    const uniqueResults = Array.from(
      new Map(results.map((item) => [item.id, item])).values()
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Limit to 20 items total
    const limitedResults = uniqueResults.slice(0, 20)

    console.log(`✅ X API returned ${limitedResults.length} news items`)

    return NextResponse.json(limitedResults)
  } catch (error) {
    console.error("X API error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch X news",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

