import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.resolve(process.cwd(), 'transactions.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db: Database | null = null;

/**
 * Initialize database connection and create tables if they don't exist
 */
export async function initDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
  
  // Create users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create accounts table (Capital One accounts)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
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
    )
  `);
  
  // Create transactions table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
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
    )
  `);

  // Create indexes for faster queries
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id 
    ON transactions(user_id)
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_datetime 
    ON transactions(datetime DESC)
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_name 
    ON transactions(name)
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_accounts_user_id 
    ON accounts(user_id)
  `);

  console.log('✅ Database initialized:', DB_PATH);
  return db;
}

/**
 * Transaction item interface
 */
export interface TransactionItem {
  name: string;
  quantity: number;
  pricePerUnit: number;
  price: number; // calculated: pricePerUnit * quantity
}

/**
 * Transaction data interface
 */
export interface TransactionData {
  userId: number; // Required: user ID
  accountId?: number; // Optional: account ID
  name: string; // merchant/transaction name
  location?: string;
  items: TransactionItem[];
  datetime: Date | string;
}

/**
 * User data interface
 */
export interface UserData {
  email: string;
  name: string;
}

/**
 * Account data interface
 */
export interface AccountData {
  userId: number;
  accountNumber?: string;
  accountHolderName: string;
  accountBalance: number;
  accountType?: string;
  institution?: string;
}

/**
 * Create or get a user by email
 */
export async function getOrCreateUser(userData: UserData): Promise<number> {
  const database = await initDatabase();

  // Try to get existing user
  const existing = await database.get(
    'SELECT id FROM users WHERE email = ?',
    [userData.email]
  );

  if (existing) {
    return existing.id;
  }

  // Create new user
  const result = await database.run(
    'INSERT INTO users (email, name) VALUES (?, ?)',
    [userData.email, userData.name]
  );

  return result.lastID!;
}

/**
 * Create or update an account
 */
export async function createOrUpdateAccount(accountData: AccountData): Promise<number> {
  const database = await initDatabase();

  // Check if account exists for this user
  const existing = accountData.accountNumber
    ? await database.get(
        'SELECT id FROM accounts WHERE user_id = ? AND account_number = ?',
        [accountData.userId, accountData.accountNumber]
      )
    : await database.get(
        'SELECT id FROM accounts WHERE user_id = ? AND account_holder_name = ?',
        [accountData.userId, accountData.accountHolderName]
      );

  if (existing) {
    // Update existing account
    await database.run(
      `UPDATE accounts 
       SET account_holder_name = ?, account_balance = ?, account_type = ?, 
           institution = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        accountData.accountHolderName,
        accountData.accountBalance,
        accountData.accountType || null,
        accountData.institution || 'Capital One',
        existing.id
      ]
    );
    return existing.id;
  }

  // Create new account
  const result = await database.run(
    `INSERT INTO accounts 
     (user_id, account_number, account_holder_name, account_balance, account_type, institution)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      accountData.userId,
      accountData.accountNumber || null,
      accountData.accountHolderName,
      accountData.accountBalance,
      accountData.accountType || null,
      accountData.institution || 'Capital One'
    ]
  );

  return result.lastID!;
}

/**
 * Get user accounts
 */
export async function getUserAccounts(userId: number): Promise<any[]> {
  const database = await initDatabase();

  const rows = await database.all(
    'SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );

  return rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    accountNumber: row.account_number,
    accountHolderName: row.account_holder_name,
    accountBalance: row.account_balance,
    accountType: row.account_type,
    institution: row.institution,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

/**
 * Insert a transaction into the database
 */
export async function insertTransaction(data: TransactionData): Promise<number> {
  const database = await initDatabase();

  // Calculate prices array (pricePerUnit * quantity for each item)
  const prices = data.items.map(item => item.pricePerUnit * item.quantity);
  const quantities = data.items.map(item => item.quantity);
  const pricePerUnits = data.items.map(item => item.pricePerUnit);
  const totalAmount = prices.reduce((sum, price) => sum + price, 0);

  // Format datetime
  const datetime = data.datetime instanceof Date 
    ? data.datetime.toISOString() 
    : data.datetime;

  const result = await database.run(
    `INSERT INTO transactions 
     (user_id, account_id, name, location, items, quantities, prices, price_per_unit, total_amount, datetime)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.userId,
      data.accountId || null,
      data.name,
      data.location || null,
      JSON.stringify(data.items.map(item => item.name)), // items array as JSON
      JSON.stringify(quantities), // quantities array as JSON
      JSON.stringify(prices), // prices array as JSON
      JSON.stringify(pricePerUnits), // price per unit array as JSON
      totalAmount,
      datetime
    ]
  );

  return result.lastID!;
}

/**
 * Get all transactions, optionally filtered by date range
 */
export async function getTransactions(options?: {
  userId?: number; // Required for multi-user
  accountId?: number;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  merchantName?: string;
}): Promise<any[]> {
  const database = await initDatabase();

  let query = 'SELECT * FROM transactions WHERE 1=1';
  const params: any[] = [];

  // Require userId for multi-user support
  if (options?.userId) {
    query += ' AND user_id = ?';
    params.push(options.userId);
  }

  if (options?.accountId) {
    query += ' AND account_id = ?';
    params.push(options.accountId);
  }

  if (options?.startDate) {
    query += ' AND datetime >= ?';
    params.push(options.startDate.toISOString());
  }

  if (options?.endDate) {
    query += ' AND datetime <= ?';
    params.push(options.endDate.toISOString());
  }

  if (options?.merchantName) {
    query += ' AND name LIKE ?';
    params.push(`%${options.merchantName}%`);
  }

  query += ' ORDER BY datetime DESC';

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  if (options?.offset) {
    query += ' OFFSET ?';
    params.push(options.offset);
  }

  const rows = await database.all(query, params);

  // Parse JSON fields
  return rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    name: row.name,
    location: row.location,
    items: JSON.parse(row.items),
    quantities: JSON.parse(row.quantities),
    prices: JSON.parse(row.prices),
    pricePerUnit: JSON.parse(row.price_per_unit),
    totalAmount: row.total_amount,
    datetime: row.datetime,
    createdAt: row.created_at
  }));
}

/**
 * Get a single transaction by ID
 */
export async function getTransactionById(id: number): Promise<any | null> {
  const database = await initDatabase();

  const row = await database.get('SELECT * FROM transactions WHERE id = ?', [id]);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    location: row.location,
    items: JSON.parse(row.items),
    quantities: JSON.parse(row.quantities),
    prices: JSON.parse(row.prices),
    pricePerUnit: JSON.parse(row.price_per_unit),
    totalAmount: row.total_amount,
    datetime: row.datetime,
    createdAt: row.created_at
  };
}

/**
 * Get transaction statistics
 */
export async function getTransactionStats(): Promise<{
  totalTransactions: number;
  totalAmount: number;
  averageAmount: number;
  merchants: { name: string; count: number; total: number }[];
}> {
  const database = await initDatabase();

  const totalRow = await database.get(
    'SELECT COUNT(*) as count, SUM(total_amount) as total FROM transactions'
  );

  const merchantRows = await database.all(
    `SELECT name, COUNT(*) as count, SUM(total_amount) as total 
     FROM transactions 
     GROUP BY name 
     ORDER BY total DESC 
     LIMIT 10`
  );

  return {
    totalTransactions: totalRow?.count || 0,
    totalAmount: totalRow?.total || 0,
    averageAmount: totalRow?.count > 0 ? (totalRow.total / totalRow.count) : 0,
    merchants: merchantRows.map((row: any) => ({
      name: row.name,
      count: row.count,
      total: row.total
    }))
  };
}

/**
 * Get the first user from the database, or create a default one if none exists
 */
export async function getFirstUser(): Promise<number> {
  const database = await initDatabase();
  
  // Try to get the first user
  const firstUser = await database.get(
    'SELECT id FROM users ORDER BY id ASC LIMIT 1'
  );
  
  if (firstUser) {
    return firstUser.id;
  }
  
  // Create a default user if none exists
  const result = await database.run(
    'INSERT INTO users (email, name) VALUES (?, ?)',
    ['default@example.com', 'Default User']
  );
  
  return result.lastID!;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

