"use client"

import { useState } from "react"
import { Upload, Zap, Check, X, AlertCircle } from "lucide-react"

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

export function InlineReceiptFlow({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<"hidden" | "upload" | "fetching" | "results" | "error">("upload")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>("")

  const handleFileSelect = async (file: File) => {
    console.log('📤 [Frontend] File selected:', {
      name: file.name,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      type: file.type
    })
    
    setUploadedFile(file)
    setState("fetching")
    setErrorMessage("")

    try {
      console.log('📤 [Frontend] Creating FormData and sending to /api/receipts...')
      const formData = new FormData()
      formData.append('image', file)

      console.log('📡 [Frontend] Sending POST request to /api/receipts...')
      const response = await fetch('/api/receipts', {
        method: 'POST',
        body: formData
      })

      console.log('📥 [Frontend] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      const result = await response.json()
      console.log('📥 [Frontend] Response data:', {
        success: result.success,
        hasReceipt: !!result.receipt,
        itemsCount: result.receipt?.items?.length || 0,
        orderName: result.receipt?.orderName,
        error: result.error
      })

      if (!response.ok) {
        console.error('❌ [Frontend] API returned error:', result.error)
        throw new Error(result.error || 'Failed to process receipt')
      }

      if (result.receipt && result.receipt.items && result.receipt.items.length > 0) {
        console.log('✅ [Frontend] Receipt data received successfully:', {
          orderName: result.receipt.orderName,
          itemsCount: result.receipt.items.length,
          total: result.receipt.total,
          transactionId: result.transactionId
        })
        setReceiptData(result.receipt)
        setState("results")
        console.log('✅ [Frontend] State updated to "results"')
        
        // Trigger refresh of Recent Transactions if receipt was saved to database
        if (result.transactionId) {
          console.log('🔄 [Frontend] Dispatching refresh event for Recent Transactions')
          window.dispatchEvent(new CustomEvent('receiptSaved', { 
            detail: { transactionId: result.transactionId } 
          }))
        }
      } else {
        console.error('❌ [Frontend] No receipt data found in response:', result)
        throw new Error('No receipt data found in response')
      }
    } catch (error) {
      console.error('❌ [Frontend] Error processing receipt:', error)
      if (error instanceof Error) {
        console.error('❌ [Frontend] Error details:', {
          message: error.message,
          stack: error.stack
        })
      }
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process receipt')
      setState("error")
      console.log('❌ [Frontend] State updated to "error"')
    }
  }

  const handleReset = () => {
    setUploadedFile(null)
    setReceiptData(null)
    setErrorMessage("")
    setState("upload")
  }

  const handleClose = () => {
    setUploadedFile(null)
    setReceiptData(null)
    setErrorMessage("")
    setState("hidden")
    onClose()
  }

  return (
    <>
      {/* Upload State */}
      {state === "upload" && (
        <div className="mb-8 animate-in fade-in duration-300">
          <div className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Upload Receipt</h3>
              <button onClick={handleClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="block">
              <div className="border-2 border-dashed border-primary/30 rounded-xl p-12 hover:border-primary/60 transition-colors cursor-pointer text-center">
                <Upload className="w-12 h-12 text-primary mx-auto mb-4 opacity-60" />
                <p className="font-medium mb-2">Drop receipt image here or click to select</p>
                <p className="text-sm text-muted-foreground">PNG, JPG or PDF up to 5MB</p>
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
              onClick={handleClose}
              className="w-full mt-6 py-2 px-4 border border-white/20 dark:border-white/10 rounded-lg text-foreground font-medium hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Fetching State */}
      {state === "fetching" && (
        <div className="mb-8 animate-in fade-in duration-300">
          <div className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-2xl p-12">
            <div className="flex flex-col items-center gap-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
                <Zap className="absolute inset-0 m-auto w-8 h-8 text-primary" />
              </div>

              <div className="text-center">
                <p className="font-semibold text-lg mb-6">Analyzing receipt…</p>
                <p className="text-sm text-muted-foreground mb-8">Extracting purchase information</p>

                {/* Animated progress indicators */}
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-2 bg-gradient-to-r from-primary/20 via-primary/50 to-primary/20 rounded-full overflow-hidden"
                      style={{
                        animation: `slideIn 2s ease-in-out ${i * 0.3}s infinite`,
                      }}
                    >
                      <div
                        className="h-full bg-gradient-to-r from-transparent via-primary to-transparent"
                        style={{
                          animation: `slide 1.5s ease-in-out ${i * 0.3}s infinite`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {state === "error" && (
        <div className="mb-8 animate-in fade-in duration-300">
          <div className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                Processing Error
              </h3>
              <button onClick={handleClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Try Again
              </button>
              <button
                onClick={handleClose}
                className="flex-1 py-2 px-4 border border-white/20 dark:border-white/10 rounded-lg text-foreground font-medium hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results State */}
      {state === "results" && receiptData && (
        <div className="mb-8 animate-in fade-in duration-300">
          <div className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  Receipt Analyzed
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Found {receiptData.items.length} item{receiptData.items.length !== 1 ? 's' : ''} from {receiptData.orderName}
                </p>
              </div>
              <button onClick={handleClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Merchant Info Card */}
            <div className="mb-6 p-4 bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">Merchant</p>
              <p className="text-2xl font-bold">{receiptData.orderName}</p>
              {receiptData.location && (
                <p className="text-xs text-muted-foreground mt-1">{receiptData.location}</p>
              )}
              {receiptData.dateTime && (
                <p className="text-xs text-muted-foreground mt-1">
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
            <div className="mb-6 p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">${receiptData.total.toFixed(2)}</p>
            </div>

            {/* Items List */}
            <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto">
              {receiptData.items.map((item, index) => (
                <div
                  key={index}
                  className="p-4 bg-white/50 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-lg hover:bg-white/70 dark:hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-muted-foreground mt-1">Quantity: {item.quantity}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold">${item.price.toFixed(2)}</p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-muted-foreground">${item.ppu.toFixed(2)} each</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            {receiptData.subtotal && (
              <div className="mb-6 space-y-2 text-sm">
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
                <div className="flex justify-between font-semibold pt-2 border-t border-white/20">
                  <span>Total:</span>
                  <span>${receiptData.total.toFixed(2)}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleReset}
              className="w-full py-3 px-4 bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-lg font-medium hover:shadow-lg transition-all duration-300"
            >
              Analyze Another Receipt
            </button>
          </div>
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
