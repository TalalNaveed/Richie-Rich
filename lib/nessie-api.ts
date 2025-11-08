export interface NessieCustomer {
  _id: string
  first_name: string
  last_name: string
  address: {
    street_number: string
    street_name: string
    city: string
    state: string
    zip: string
  }
}

export interface NessieAccount {
  _id: string
  type: string
  nickname: string
  rewards: number
  balance: number
  customer_id: string
  bill_ids: string[]
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
 * Fetches customers from the Nessie API through Next.js API route
 * Limits result size for dev speed
 */
export async function getCustomers(limit = 10): Promise<NessieCustomer[]> {
  const response = await fetch(`/api/customers`, { cache: "no-store" })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    console.error("API route error (customers):", error)
    throw new Error(error.error || `Failed to fetch customers: ${response.statusText}`)
  }

  const raw = await response.json()
  const normalized = normalizeArray<NessieCustomer>(raw)
  const sampled = sampleArray(normalized, limit)

  console.log(`✅ getCustomers returned ${sampled.length}/${normalized.length} customers (sampled)`)
  return sampled
}

/**
 * Fetches accounts from the Nessie API through Next.js API route
 * Limits result size for dev speed
 */
export async function getAccounts(limit = 10): Promise<NessieAccount[]> {
  const response = await fetch(`/api/accounts`, { cache: "no-store" })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    console.error("API route error (accounts):", error)
    throw new Error(error.error || `Failed to fetch accounts: ${response.statusText}`)
  }

  const raw = await response.json()
  const normalized = normalizeArray<NessieAccount>(raw)
  const sampled = sampleArray(normalized, limit)

  console.log(`✅ getAccounts returned ${sampled.length}/${normalized.length} accounts (sampled)`)
  return sampled
}
