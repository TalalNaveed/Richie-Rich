# HackPrinceton - Financial Dashboard Setup Guide

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd HackPrinceton
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   # IMPORTANT: Make sure DATABASE_URL is set to:
   # DATABASE_URL="file:./bank.db"
   ```

4. **Database is already included!**
   - The `bank.db` file is included in the repository
   - It contains sample data for User 1 and User 2
   - No need to run migrations or seed scripts

5. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

6. **Start the development server**
   ```bash
   pnpm dev
   ```

7. **Visit the dashboard**
   - User 1: http://localhost:3000/user1
   - User 2: http://localhost:3000/user2

## Database Configuration

The database file (`bank.db`) is located in the project root. The `DATABASE_URL` in `.env` should be:
```
DATABASE_URL="file:./bank.db"
```

## Features

- **Receipt Upload**: Upload receipts via web or iMessage
- **Knot API Integration**: Automatic transaction import
- **Source Tracking**: See where each transaction came from (Knot API or Receipt Upload)
- **Multi-User Support**: User 1 and User 2 dashboards

## Demo Reset

To reset receipt transactions for demo purposes:
```bash
./reset.sh
# or
pnpm run db:reset-receipts
```

This removes all receipt uploads but keeps Knot API transactions.

## API Keys Required

- Knot API (for transaction import)
- Capital One Nessie API (for account data)
- xAI/Grok API (for receipt processing)
- Google Gemini API (for OCR)

See `.env.example` for all required environment variables.
