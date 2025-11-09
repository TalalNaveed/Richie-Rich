"use client"

import { useState } from "react"
import type React from "react"
import { Upload, Zap, Check, X } from "lucide-react"

interface ReceiptItem {
  name: string
  receiptPrice: number
  onlinePrice: number
  source: string
}

const mockReceiptData: ReceiptItem[] = [
  {
    name: "Sunflower Oil (1L)",
    receiptPrice: 3.5,
    onlinePrice: 3.4,
    source: "Walmart.com",
  },
  {
    name: "Organic Spinach (10oz)",
    receiptPrice: 2.99,
    onlinePrice: 2.49,
    source: "Whole Foods",
  },
  {
    name: "Greek Yogurt (32oz)",
    receiptPrice: 5.49,
    onlinePrice: 4.99,
    source: "Amazon Fresh",
  },
  {
    name: "Almond Milk (64oz)",
    receiptPrice: 4.29,
    onlinePrice: 3.79,
    source: "Instacart",
  },
]

export function ReceiptUploadSidebar() {
  const [state, setState] = useState<"upload" | "fetching" | "results">("upload")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const handleFileSelect = (file: File) => {
    setUploadedFile(file)
    setState("fetching")
    // Simulate fetching delay
    setTimeout(() => {
      setState("results")
    }, 3500)
  }

  const handleReset = () => {
    setUploadedFile(null)
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

  const totalSavings = mockReceiptData.reduce((sum, item) => sum + (item.receiptPrice - item.onlinePrice), 0)

  return (
    <>
      {/* Upload State */}
      {state === "upload" && (
        <div className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-2xl p-8 h-fit lg:sticky lg:top-8">
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
              accept="image/png,image/jpeg,application/pdf"
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
        <div className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-2xl p-8 md:p-12 h-fit lg:sticky lg:top-8">
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
              <Zap className="absolute inset-0 m-auto w-8 h-8 text-primary" />
            </div>

            <div className="text-center">
              <p className="font-semibold text-lg mb-6">Analyzing receipt…</p>
              <p className="text-sm text-muted-foreground mb-8">Searching the web for better prices</p>

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
      )}

      {/* Results State */}
      {state === "results" && (
        <div className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-2xl p-8 h-fit lg:sticky lg:top-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                Receipt Analyzed
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Found {mockReceiptData.length} items with price comparisons
              </p>
            </div>
            <button onClick={handleReset} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Total Savings Card */}
          <div className="mb-6 p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">Total Potential Savings</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">${totalSavings.toFixed(2)}</p>
          </div>

          {/* Results List */}
          <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto">
            {mockReceiptData.map((item, index) => {
              const savings = item.receiptPrice - item.onlinePrice
              return (
                <div
                  key={index}
                  className="p-4 bg-white/50 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-lg hover:bg-white/70 dark:hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">Source: {item.source}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-green-600 dark:text-green-400 font-semibold">
                        Save ${savings.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-muted-foreground">Receipt: </span>
                      <span className="font-medium">${item.receiptPrice.toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground">Online: </span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        ${item.onlinePrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={handleReset}
            className="w-full py-3 px-4 bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-lg font-medium hover:shadow-lg transition-all duration-300"
          >
            Compare Another Receipt
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

