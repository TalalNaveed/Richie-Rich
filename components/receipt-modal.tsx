"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Upload, Zap } from "lucide-react"
import { ReceiptInsights } from "./receipt-insights"

interface ReceiptModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ReceiptModal({ isOpen, onClose }: ReceiptModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<"upload" | "fetching" | "insights">("upload")

  useEffect(() => {
    if (!isOpen) {
      setState("upload")
      setFile(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleClose = () => {
    setFile(null)
    setState("upload")
    onClose()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      setFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setFile(files[0])
    }
  }

  const handleSubmit = () => {
    if (file) {
      setState("fetching")
      // Simulate API call with 3-4 second delay
      setTimeout(() => {
        setState("insights")
      }, 3500)
    }
  }

  const handleBackToUpload = () => {
    setFile(null)
    setState("upload")
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-3xl w-full max-w-md p-8 relative animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {state === "upload" && (
          <>
            <h2 className="text-2xl font-bold mb-2">Add Receipt</h2>
            <p className="text-muted-foreground mb-6">Upload a receipt to track your expense</p>

            {/* Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer ${
                isDragging ? "border-primary bg-primary/5" : "border-border"
              } ${file ? "bg-primary/5 border-primary" : ""}`}
            >
              <input
                type="file"
                id="receipt-input"
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*,.pdf"
              />

              <label htmlFor="receipt-input" className="flex flex-col items-center gap-3 cursor-pointer">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${file ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  <Upload className="w-6 h-6" />
                </div>

                <div>
                  <p className="font-semibold text-foreground">{file ? file.name : "Drag and drop your receipt"}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {file ? "Ready to upload" : "or click to browse"}
                  </p>
                </div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={handleClose}
                className="flex-1 py-3 px-4 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!file}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-lg font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                Upload
              </button>
            </div>
          </>
        )}

        {state === "fetching" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-spin"></div>
              <div
                className="absolute inset-2 rounded-full border-4 border-transparent border-t-primary border-r-primary animate-spin"
                style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary animate-pulse" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-foreground">Searching the web</p>
              <p className="text-sm text-muted-foreground">Finding the best prices for your items…</p>
            </div>

            {/* Animated Progress Bars */}
            <div className="w-full space-y-2 pt-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full animate-pulse"
                    style={{
                      animation: `slideRight 2s ease-in-out ${i * 0.3}s infinite`,
                    }}
                  ></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {state === "insights" && <ReceiptInsights onBack={handleBackToUpload} />}
      </div>

      {/* Add CSS animation for progress bars */}
      <style>{`
        @keyframes slideRight {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  )
}
