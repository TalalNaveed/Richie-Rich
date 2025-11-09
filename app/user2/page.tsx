import { Dashboard } from "@/components/dashboard"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function getUserData(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      transactions: {
        include: {
          items: true,
        },
        orderBy: {
          datetime: 'desc',
        },
        take: 20,
      },
    },
  })
  
  // Serialize dates to strings for JSON
  if (user) {
    return {
      ...user,
      transactions: user.transactions.map(tx => ({
        ...tx,
        datetime: tx.datetime.toISOString(),
        items: tx.items,
      })),
    }
  }
  
  return null
}

export default async function User2Page() {
  const user = await getUserData(2)
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">User 2 Not Found</h1>
          <p className="text-muted-foreground">Please run the seed script to create user data.</p>
        </div>
      </div>
    )
  }

  return <Dashboard userData={user as any} userId={2} />
}

