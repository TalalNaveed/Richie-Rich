"use client"

import { X, Calendar, Store, Tag, DollarSign, Package, Receipt } from "lucide-react"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Transaction {
  id: string
  merchant: string
  amount: number
  date: string
  type: "credit" | "debit"
  category: string
  source?: string // "knot", "receipt", "manual"
  items?: Array<{
    name: string
    price: number
    quantity?: number
  }>
}

interface TransactionDetailsModalProps {
  transaction: Transaction | null
  open: boolean
  onClose: () => void
}

export function TransactionDetailsModal({ transaction, open, onClose }: TransactionDetailsModalProps) {
  if (!transaction) return null

  const isCredit = transaction.type === "credit"
  const totalItems = transaction.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0
  const subtotal = transaction.items?.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0) || transaction.amount

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Store className="w-6 h-6" />
            {transaction.merchant}
            {transaction.source === 'knot' && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 ml-2">
                <div className="w-4 h-4 relative">
                  <Image src="/knot.avif" alt="Knot" fill className="object-contain" />
                </div>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Knot API</span>
              </div>
            )}
            {transaction.source === 'receipt' && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 ml-2">
                <Receipt className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">Receipt Upload</span>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Amount and Type */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Transaction Amount</p>
              <p className={`text-3xl font-bold ${isCredit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {isCredit ? "+" : "-"}${transaction.amount.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Type</p>
              <p className="font-semibold capitalize">{transaction.type}</p>
            </div>
          </div>

          {/* Transaction Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{transaction.date}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Tag className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium">{transaction.category}</p>
              </div>
            </div>
          </div>

          {/* Data Source */}
          {transaction.source && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-5 h-5 flex items-center justify-center mt-0.5">
                {transaction.source === 'knot' ? (
                  <div className="w-5 h-5 relative">
                    <Image src="/knot.avif" alt="Knot" fill className="object-contain" />
                  </div>
                ) : transaction.source === 'receipt' ? (
                  <Receipt className="w-5 h-5 text-muted-foreground" />
                ) : null}
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Data Source</p>
                <p className="font-medium capitalize">
                  {transaction.source === 'knot' && 'Knot API'}
                  {transaction.source === 'receipt' && 'Receipt Upload'}
                  {transaction.source === 'manual' && 'Manual Entry'}
                </p>
                {transaction.source === 'knot' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    This transaction was automatically imported from Knot API
                  </p>
                )}
                {transaction.source === 'receipt' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    This transaction was created from an uploaded receipt
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Items List */}
          {transaction.items && transaction.items.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Items ({totalItems})</h3>
              </div>
              <div className="space-y-2">
                {transaction.items.map((item, idx) => {
                  const itemTotal = item.price * (item.quantity || 1)
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ${item.price.toFixed(2)} {item.quantity && item.quantity > 1 && `× ${item.quantity}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${itemTotal.toFixed(2)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Subtotal */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold">Subtotal</p>
                  <p className="text-lg font-bold">${subtotal.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Transaction ID */}
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Transaction ID: <span className="font-mono">{transaction.id}</span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}



