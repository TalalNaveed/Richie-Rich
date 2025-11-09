"use client"

import { useState } from "react"
import type React from "react"
import { Upload, Zap, Check, X, AlertCircle } from "lucide-react"
import { SavingsSuggestions } from "./savings-suggestions"
import { ProcessingDemo } from "./processing-demo"

interface ReceiptItem {
  name: string
  quantity: number
  ppu: number
  price: number
}

interface ReceiptData {
  orderName: string
  location?: string
  items: ReceiptItem[]
  prices: number[]
  ppu: number[]
  quantities: number[]
  dateTime: string
  subtotal?: number
  tax?: number
  tip?: number
  total: number
}

export function ReceiptUploadSidebar() {
  const [state, setState] = useState<"upload" | "fetching" | "results" | "error">("upload")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>("")

  const handleFileSelect = async (file: File) => {
    console.log('📤 [Sidebar] File selected:', {
      name: file.name,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      type: file.type
    })
    
    setUploadedFile(file)
    setState("fetching")
    setErrorMessage("")

    try {
      console.log('📤 [Sidebar] Creating FormData and sending to /api/receipts...')
      const formData = new FormData()
      formData.append('image', file)

      console.log('📡 [Sidebar] Sending POST request to /api/receipts...')
      const response = await fetch('/api/receipts', {
        method: 'POST',
        body: formData
      })

      console.log('📥 [Sidebar] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      const result = await response.json()
      console.log('📥 [Sidebar] Response data:', {
        success: result.success,
        hasReceipt: !!result.receipt,
        itemsCount: result.receipt?.items?.length || 0,
        orderName: result.receipt?.orderName,
        error: result.error
      })

      if (!response.ok) {
        console.error('❌ [Sidebar] API returned error:', result.error)
        throw new Error(result.error || 'Failed to process receipt')
      }

      if (result.receipt && result.receipt.items && result.receipt.items.length > 0) {
        console.log('✅ [Sidebar] Receipt data received successfully:', {
          orderName: result.receipt.orderName,
          itemsCount: result.receipt.items.length,
          total: result.receipt.total,
          transactionId: result.transactionId
        })
        setReceiptData(result.receipt)
        setState("results")
        console.log('✅ [Sidebar] State updated to "results"')
        
        // Trigger refresh of Recent Transactions if receipt was saved to database
        if (result.transactionId) {
          console.log('🔄 [Sidebar] Dispatching refresh event for Recent Transactions')
          window.dispatchEvent(new CustomEvent('receiptSaved', { 
            detail: { transactionId: result.transactionId } 
          }))
        }
      } else {
        console.error('❌ [Sidebar] No receipt data found in response:', result)
        throw new Error('No receipt data found in response')
      }
    } catch (error) {
      console.error('❌ [Sidebar] Error processing receipt:', error)
      if (error instanceof Error) {
        console.error('❌ [Sidebar] Error details:', {
          message: error.message,
          stack: error.stack
        })
      }
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process receipt')
      setState("error")
      console.log('❌ [Sidebar] State updated to "error"')
    }
  }

  const handleReset = () => {
    setUploadedFile(null)
    setReceiptData(null)
    setErrorMessage("")
    setState("upload")
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  return (
    <>
      {/* Upload State */}
      {state === "upload" && (
        <div className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-2xl p-8 max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold mb-6">Upload Receipt</h3>

          <label className="block">
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-primary/30 rounded-xl p-8 md:p-12 hover:border-primary/60 transition-colors cursor-pointer text-center"
            >
              <Upload className="w-10 h-10 md:w-12 md:h-12 text-primary mx-auto mb-4 opacity-60" />
              <p className="font-medium mb-2 text-sm md:text-base">Drop receipt image here or click to select</p>
              <p className="text-xs md:text-sm text-muted-foreground">PNG, JPG or PDF up to 5MB</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/png,image/jpeg,image/jpg,application/pdf"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileSelect(e.target.files[0])
                }
              }}
            />
          </label>

          <button
            onClick={handleReset}
            className="w-full mt-6 py-2 px-4 border border-white/20 dark:border-white/10 rounded-lg text-foreground font-medium hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Fetching State */}
      {state === "fetching" && (
        <div className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-2xl p-8 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary animate-pulse" />
              Processing Receipt
            </h3>
          </div>

          {uploadedFile && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-1">File: {uploadedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                Size: {(uploadedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          )}

          <ProcessingDemo isProcessing={true} />
        </div>
      )}

      {/* Error State */}
      {state === "error" && (
        <div className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-2xl p-8 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              Processing Error
            </h3>
            <button onClick={handleReset} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
          </div>

          <button
            onClick={handleReset}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Results State */}
      {state === "results" && receiptData && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/90 to-blue-50/50 dark:from-white/10 dark:to-blue-950/20 border border-blue-200/30 dark:border-blue-800/20 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Check className="w-6 h-6 text-green-500" />
                  Receipt Analyzed
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Found {receiptData.items.length} item{receiptData.items.length !== 1 ? 's' : ''} from {receiptData.orderName}
                </p>
              </div>
              <button onClick={handleReset} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cards Container - Flex Row with Wrapping */}
          <div className="flex flex-row flex-wrap gap-6">
            {/* Merchant Info Card */}
            <div className="flex-1 min-w-[280px] max-w-[400px] backdrop-blur-xl bg-gradient-to-br from-blue-50/90 to-indigo-50/90 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/40 dark:border-blue-800/30 rounded-xl p-5 shadow-md">
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2 font-medium">Merchant</p>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{receiptData.orderName}</p>
              {receiptData.location && (
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-2 flex items-center gap-1">
                  <span>📍</span> {receiptData.location}
                </p>
              )}
              {receiptData.dateTime && (
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1 flex items-center gap-1">
                  <span>📅</span>
                  {new Date(receiptData.dateTime).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>

            {/* Total Amount Card */}
            <div className="flex-1 min-w-[280px] max-w-[400px] backdrop-blur-xl bg-gradient-to-br from-green-50/90 to-emerald-50/90 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200/40 dark:border-green-800/30 rounded-xl p-5 shadow-md">
              <p className="text-sm text-green-700 dark:text-green-300 mb-2 font-medium">Total Amount</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">${receiptData.total.toFixed(2)}</p>
            </div>

            {/* Items List Card */}
            <div className="w-full min-w-[280px] backdrop-blur-xl bg-gradient-to-br from-white/90 to-slate-50/50 dark:from-white/10 dark:to-slate-950/20 border border-slate-200/30 dark:border-slate-800/20 rounded-xl p-6 shadow-md">
              <h4 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-300">Items</h4>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {receiptData.items.map((item, index) => (
                  <div
                    key={index}
                    className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-slate-50/50 dark:from-white/5 dark:to-slate-950/10 border border-white/30 dark:border-white/10 rounded-xl p-4 hover:bg-white/90 dark:hover:bg-white/10 hover:border-primary/30 dark:hover:border-primary/20 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-base text-foreground">{item.name}</p>
                        {item.quantity > 1 && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-muted-foreground">
                              Quantity: {item.quantity}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ${item.ppu.toFixed(2)} each
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-lg text-foreground">${item.price.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Card */}
            {receiptData.subtotal && (
              <div className="flex-1 min-w-[280px] max-w-[400px] backdrop-blur-xl bg-gradient-to-br from-white/90 to-amber-50/50 dark:from-white/10 dark:to-amber-950/20 border border-amber-200/30 dark:border-amber-800/20 rounded-xl p-5 shadow-md">
                <h4 className="text-lg font-semibold mb-4 text-amber-700 dark:text-amber-300">Summary</h4>
                <div className="space-y-2 text-sm">
                  {receiptData.subtotal !== receiptData.total && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal:</span>
                      <span>${receiptData.subtotal.toFixed(2)}</span>
                    </div>
                  )}
                  {receiptData.tax > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax:</span>
                      <span>${receiptData.tax.toFixed(2)}</span>
                    </div>
                  )}
                  {receiptData.tip && receiptData.tip > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tip:</span>
                      <span>${receiptData.tip.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-2 border-t border-amber-200/30 dark:border-amber-800/20">
                    <span>Total:</span>
                    <span>${receiptData.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Savings Suggestions - Full Width Below Cards */}
          <div className="w-full">
            <SavingsSuggestions receiptItems={receiptData.items} />
          </div>

          {/* Action Button */}
          <button
            onClick={handleReset}
            className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-500 dark:to-emerald-500 text-white rounded-xl font-semibold hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
          >
            Analyze Another Receipt
          </button>
        </div>
      )}

      <style>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes slideIn {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }
      `}</style>
    </>
  )
}
