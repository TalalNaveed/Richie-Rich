# Knot API Testing Guide

This guide explains how to test the Knot API integration using the testing flow described in the [Knot API documentation](https://docs.knotapi.com/transaction-link/testing).

## Testing Flow

### Step 1: Create a Session

Create a session with `type: transaction_link` and a dummy `external_user_id`.

**API Endpoint:** `POST /api/sessions`

**Request Body:**
```json
{
  "external_user_id": "user-123",
  "type": "transaction_link"
}
```

**Example using curl:**
```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "external_user_id": "user-123",
    "type": "transaction_link"
  }'
```

**Response:**
```json
{
  "session_id": "session_abc123...",
  "external_user_id": "user-123",
  "type": "transaction_link"
}
```

> **Note:** If you intend to test generating transactions multiple times consecutively in a short period, it is recommended to use a different dummy `external_user_id` for each session.

### Step 2: Use the Session

Once you have a `session_id`, you can use it to:
- Invoke the SDK (if using the Knot SDK)
- Fetch transactions using the sync endpoint

**Fetch Transactions:**
```bash
curl "http://localhost:3000/api/transactions?external_user_id=user-123&limit=5"
```

### Step 3: Login to Merchant Account (SDK Testing)

If you're using the Knot SDK, you can login to a merchant account using the test credentials below.

## Test Credentials

### New Transactions

**Username:** `user_good_transactions`  
**Password:** `pass_good`

**What happens:**
- Your user's merchant account will be successfully linked
- 205 new transactions will be generated within a few seconds
- You will be notified via the `NEW_TRANSACTIONS_AVAILABLE` event
- Transactions will be retrievable via [Sync Transactions](/api/transactions)

### New and Updated Transactions

**Username:** `user_good_transactions`  
**Password:** `pass_good_updates`

**What happens:**
- Your user's merchant account will be successfully linked
- 205 new transactions will be generated within a few seconds
- You will be notified via the `NEW_TRANSACTIONS_AVAILABLE` event
- Additionally, 3 transactions will be updated
- You will be notified via the `UPDATED_TRANSACTIONS_AVAILABLE` event
- Updated transactions will be retrievable via [Get Transaction By ID](https://docs.knotapi.com/api-reference/products/transaction-link/get-by-id)

## Using the Session in Code

### JavaScript/TypeScript

```typescript
import { createSession } from '@/lib/knot-api'

// Create a session
const session = await createSession('user-123', 'transaction_link')
console.log('Session ID:', session.session_id)

// Use the session_id for SDK or API calls
```

### Direct API Usage

The current implementation uses the sync endpoint directly, which doesn't require a session. However, you can create sessions for testing purposes:

```typescript
// Create session
const sessionResponse = await fetch('/api/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    external_user_id: 'user-123',
    type: 'transaction_link'
  })
})
const session = await sessionResponse.json()

// Use session_id if needed for SDK
console.log('Session ID:', session.session_id)
```

## Testing Multiple Sessions

For testing multiple sessions consecutively, use different `external_user_id` values:

```typescript
// First session
await createSession('user-123', 'transaction_link')

// Second session (different user ID)
await createSession('user-456', 'transaction_link')

// Third session (different user ID)
await createSession('user-789', 'transaction_link')
```

## References

- [Knot API Testing Documentation](https://docs.knotapi.com/transaction-link/testing)
- [Create Session API Reference](https://docs.knotapi.com/api-reference/sessions/create-session)
- [Sync Transactions API Reference](https://docs.knotapi.com/api-reference/products/transaction-link/sync)

