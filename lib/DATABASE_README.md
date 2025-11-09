# SQLite Transaction Database - Multi-User Support

This module provides SQLite database storage for transactions with **multi-user support** and relational structure.

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Accounts Table (Capital One)
```sql
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  account_number TEXT,
  account_holder_name TEXT NOT NULL,
  account_balance REAL NOT NULL DEFAULT 0.0,
  account_type TEXT,
  institution TEXT DEFAULT 'Capital One',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  account_id INTEGER,
  name TEXT NOT NULL,
  location TEXT,
  items TEXT NOT NULL,
  quantities TEXT NOT NULL,
  prices TEXT NOT NULL,
  price_per_unit TEXT NOT NULL,
  total_amount REAL NOT NULL,
  datetime TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
);
```

## Usage

### Create or Get User

```typescript
import { getOrCreateUser } from '@/lib/database';

const userId = await getOrCreateUser({
  email: 'user@example.com',
  name: 'John Doe'
});
```

### Create or Update Account

```typescript
import { createOrUpdateAccount } from '@/lib/database';

const accountId = await createOrUpdateAccount({
  userId: 1,
  accountNumber: '1234567890',
  accountHolderName: 'John Doe',
  accountBalance: 5000.00,
  accountType: 'checking',
  institution: 'Capital One'
});
```

### Save a Transaction

```typescript
import { insertTransaction } from '@/lib/database';

const transactionId = await insertTransaction({
  userId: 1,
  accountId: 1, // Optional
  name: 'Walmart',
  location: '123 Main St',
  items: [
    {
      name: 'Potatoes',
      quantity: 2.5,        // Weight-based (lbs)
      pricePerUnit: 1.99,   // Price per pound
      price: 4.975          // 2.5 × 1.99
    },
    {
      name: 'Milk',
      quantity: 1,          // Individual item
      pricePerUnit: 3.49,  // Price for 1 unit
      price: 3.49          // 1 × 3.49
    }
  ],
  datetime: new Date()
});
```

### Query Transactions (User-Specific)

```typescript
import { getTransactions } from '@/lib/database';

// Get transactions for a specific user
const userTransactions = await getTransactions({
  userId: 1, // Required!
  limit: 10,
  offset: 0,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  merchantName: 'Walmart'
});
```

### Get User Accounts

```typescript
import { getUserAccounts } from '@/lib/database';

const accounts = await getUserAccounts(userId: 1);
// Returns accounts with accountBalance and accountHolderName
```

## API Endpoints

### Users & Accounts
- `POST /api/accounts/db` - Create/update account
- `GET /api/accounts/db?userId=1` - Get user accounts

### Transactions
- `POST /api/transactions/db` - Save a transaction (requires userId or user object)
- `GET /api/transactions/db?userId=1` - Get transactions (requires userId)
- `GET /api/transactions/db/[id]` - Get single transaction
- `GET /api/transactions/db/stats?userId=1` - Get statistics (optional userId)

## Multi-User Support

✅ **All transactions are user-scoped**
- Every transaction requires a `userId`
- Queries automatically filter by user
- Users can have multiple accounts
- Each account has its own balance and holder name

## Price Calculation

- **Weight-based items** (potatoes, produce): `price = pricePerUnit × quantity`
  - Example: 2.5 lbs × $1.99/lb = $4.975
  
- **Individual items** (milk, bread): `pricePerUnit = unitPrice`, `price = pricePerUnit × 1`
  - Example: $3.49 × 1 = $3.49

## Database File

The database file is stored at: `transactions.db` (in project root)

This file is gitignored and should not be committed.

