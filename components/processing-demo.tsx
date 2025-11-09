"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Loader2, Image as ImageIcon, Sparkles, FileText, Database, Zap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface ProcessingStep {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  status: "pending" | "processing" | "completed" | "error"
  details?: string
}

interface ProcessingDemoProps {
  isProcessing: boolean
  onComplete?: () => void
}

export function ProcessingDemo({ isProcessing, onComplete }: ProcessingDemoProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState<ProcessingStep[]>([
    {
      id: "upload",
      name: "Image Upload",
      description: "Receiving and saving image file",
      icon: <ImageIcon className="w-5 h-5" />,
      status: "pending",
    },
    {
      id: "validation",
      name: "Grok Vision Validation",
      description: "Validating receipt with xAI Grok",
      icon: <Sparkles className="w-5 h-5" />,
      status: "pending",
      details: "Checking if image is a valid receipt, clear, and extractable",
    },
    {
      id: "ocr",
      name: "Gemini OCR Processing",
      description: "Extracting receipt data with Google Gemini",
      icon: <FileText className="w-5 h-5" />,
      status: "pending",
      details: "Reading merchant name, items, prices, dates, and totals",
    },
    {
      id: "autocomplete",
      name: "Grok Autocompletion",
      description: "Enhancing item names with Grok",
      icon: <Zap className="w-5 h-5" />,
      status: "pending",
      details: "Expanding short-form item names for better clarity",
    },
    {
      id: "save",
      name: "Save to Database",
      description: "Storing transaction data",
      icon: <Database className="w-5 h-5" />,
      status: "pending",
      details: "Checking for duplicates and saving to User 1",
    },
  ])

  useEffect(() => {
    if (!isProcessing) {
      // Reset all steps
      setSteps(prev => prev.map(s => ({ ...s, status: "pending" as const })))
      setCurrentStep(0)
      return
    }

    // Simulate processing steps with realistic timing
    const stepTimings = [
      { step: 0, delay: 500 }, // Upload - quick
      { step: 1, delay: 2000 }, // Validation - Grok call
      { step: 2, delay: 4000 }, // OCR - Gemini call (longer)
      { step: 3, delay: 2000 }, // Autocomplete - Grok call
      { step: 4, delay: 1000 }, // Save - database operation
    ]

    let timeoutId: NodeJS.Timeout

    const processStep = (stepIndex: number) => {
      if (stepIndex >= steps.length) {
        if (onComplete) {
          setTimeout(() => onComplete(), 500)
        }
        return
      }

      // Mark current step as processing
      setCurrentStep(stepIndex)
      setSteps(prev =>
        prev.map((s, idx) =>
          idx === stepIndex
            ? { ...s, status: "processing" as const }
            : idx < stepIndex
            ? { ...s, status: "completed" as const }
            : s
        )
      )

      // Complete the step after delay
      const timing = stepTimings[stepIndex]
      timeoutId = setTimeout(() => {
        setSteps(prev =>
          prev.map((s, idx) =>
            idx === stepIndex ? { ...s, status: "completed" as const } : s
          )
        )
        // Move to next step
        processStep(stepIndex + 1)
      }, timing.delay)
    }

    processStep(0)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isProcessing, onComplete, steps.length])

  if (!isProcessing && currentStep === 0) {
    return null
  }

  return (
    <Card className="mt-4 backdrop-blur-xl bg-white/80 dark:bg-white/10 border-white/20 dark:border-white/10">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Loader2 className={`w-5 h-5 text-primary ${isProcessing ? "animate-spin" : ""}`} />
            <h3 className="font-semibold text-lg">Processing Receipt</h3>
          </div>

          {steps.map((step, index) => {
            const isActive = step.status === "processing"
            const isCompleted = step.status === "completed"
            const isPending = step.status === "pending"

            return (
              <div
                key={step.id}
                className={`relative flex items-start gap-4 p-4 rounded-lg border-2 transition-all duration-300 ${
                  isActive
                    ? "border-primary bg-primary/5 shadow-lg scale-[1.02]"
                    : isCompleted
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-muted bg-muted/30 opacity-60"
                }`}
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {/* Step Number and Icon */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? "bg-primary text-primary-foreground scale-110"
                      : isCompleted
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    step.icon
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4
                      className={`font-semibold transition-colors ${
                        isActive ? "text-primary" : isCompleted ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                      }`}
                    >
                      {step.name}
                    </h4>
                    {isActive && (
                      <span className="text-xs text-primary font-medium animate-pulse">
                        Processing...
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{step.description}</p>
                  {step.details && (isActive || isCompleted) && (
                    <p className="text-xs text-muted-foreground/80 italic mt-1">
                      {step.details}
                    </p>
                  )}

                  {/* Progress bar for active step */}
                  {isActive && (
                    <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full animate-pulse" style={{ width: "100%" }} />
                    </div>
                  )}
                </div>

                {/* Connecting line */}
                {index < steps.length - 1 && (
                  <div
                    className={`absolute left-[29px] top-[58px] w-0.5 h-8 transition-colors duration-300 ${
                      isCompleted ? "bg-green-500" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

