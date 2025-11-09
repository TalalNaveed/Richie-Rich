#!/bin/bash

# Reset script to remove receipt transactions for demo purposes
# This keeps Knot API transactions but removes all receipt uploads

echo "🔄 Resetting receipt transactions for demo..."
echo ""

# Run the reset script using tsx
npx --yes tsx -e "
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    // Count receipt transactions before deletion
    const receiptCount = await prisma.transaction.count({
      where: { source: 'receipt' }
    });
    
    console.log(\`📊 Found \${receiptCount} receipt transaction(s) to delete\`);
    
    if (receiptCount === 0) {
      console.log('✅ No receipt transactions found. Database is already clean.');
      await prisma.\$disconnect();
      return;
    }
    
    // Delete all receipt transactions (cascade will delete items automatically)
    const result = await prisma.transaction.deleteMany({
      where: { source: 'receipt' }
    });
    
    console.log(\`✅ Deleted \${result.count} receipt transaction(s)\`);
    console.log('');
    console.log('🎯 Database reset complete! Ready for demo.');
    console.log('   - Receipt transactions: Removed');
    console.log('   - Knot API transactions: Preserved');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
})();
"

echo ""
echo "✨ Reset complete!"

