"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { ReceiptModal } from "./receipt-modal"

export function AddReceiptButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-full shadow-2xl flex items-center justify-center text-primary-foreground hover:scale-110 transition-transform duration-300 hover:shadow-[0_20px_40px_rgba(53,211,153,0.3)] group"
      >
        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Modal */}
      <ReceiptModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
