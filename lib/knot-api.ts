export interface TransactionItem {
  name: string
  price: number
  quantity?: number
}

export interface KnotTransaction {
  id: string
  account_id?: string
  amount: number
  currency: string
  date: string
  description: string
  merchant_id?: number
  merchant_name?: string
  category?: string
  merchant?: {
    name: string
    category?: string
  }
  type: "debit" | "credit"
  status?: string
  items?: TransactionItem[]
  line_items?: TransactionItem[]
  products?: TransactionItem[]
}

export interface KnotAccount {
  id: string
  name: string
  type: string
  balance?: number
  currency: string
  institution?: {
    name: string
  }
  last_synced?: string
}

/**
 * Utility function to safely normalize API data
 */
function normalizeArray<T>(data: any): T[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (typeof data === "object") return Object.values(data) as T[]
  return []
}

/**
 * Randomly sample from an array
 */
function sampleArray<T>(arr: T[], limit = 10): T[] {
  if (!Array.isArray(arr)) return []
  return arr.sort(() => 0.5 - Math.random()).slice(0, limit)
}

/**
 * Fetches transactions from the Knot API transaction sync endpoint
 * @param merchantId - Optional merchant ID (defaults to fetching from all merchants)
 * @param externalUserId - User identifier (defaults to "user-123")
 * @param limit - Number of transactions per merchant (default: 5)
 * @param cursor - Pagination cursor for fetching more transactions
 */
export async function getTransactions(
  merchantId?: number,
  externalUserId: string = "user-123",
  limit: number = 5,
  cursor?: string
): Promise<KnotTransaction[]> {
  const params = new URLSearchParams({
    external_user_id: externalUserId,
    limit: limit.toString(),
  })

  if (merchantId) {
    params.append("merchant_id", merchantId.toString())
  }

  if (cursor) {
    params.append("cursor", cursor)
  }

  const response = await fetch(`/api/transactions?${params.toString()}`, { cache: "no-store" })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    console.error("API route error (transactions):", error)
    throw new Error(error.error || `Failed to fetch transactions: ${response.statusText}`)
  }

  const raw = await response.json()
  const normalized = normalizeArray<KnotTransaction>(raw)

  console.log(`✅ getTransactions returned ${normalized.length} transactions`)
  return normalized
}

/**
 * Creates a session for testing transaction link functionality
 * Based on Knot API documentation: https://docs.knotapi.com/transaction-link/testing
 * 
 * @param externalUserId - User identifier (use different IDs for multiple consecutive tests)
 * @param type - Session type (default: "transaction_link")
 * @returns Session data including session_id
 */
export async function createSession(
  externalUserId: string = "user-123",
  type: string = "transaction_link"
): Promise<{ session_id: string; [key: string]: any }> {
  const response = await fetch(`/api/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_user_id: externalUserId,
      type,
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    console.error("API route error (sessions):", error)
    throw new Error(error.error || `Failed to create session: ${response.statusText}`)
  }

  const sessionData = await response.json()
  console.log(`✅ Session created: ${sessionData.session_id}`)
  return sessionData
}

/**
 * Fetches accounts from the Knot API through Next.js API route
 * Limits result size for dev speed
 */
export async function getAccounts(limit = 10): Promise<KnotAccount[]> {
  const response = await fetch(`/api/accounts/knot`, { cache: "no-store" })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    console.error("API route error (accounts):", error)
    throw new Error(error.error || `Failed to fetch accounts: ${response.statusText}`)
  }

  const raw = await response.json()
  const normalized = normalizeArray<KnotAccount>(raw)
  const sampled = sampleArray(normalized, limit)

  console.log(`✅ getAccounts returned ${sampled.length}/${normalized.length} accounts (sampled)`)
  return sampled
}

