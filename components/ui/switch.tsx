'use client'

import { cn } from "@/lib/utils"
import type { ButtonHTMLAttributes } from "react"

interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

function Switch({ checked, onCheckedChange, id, disabled, className, ...props }: SwitchProps) {
  return (
    <button
      id={id}
      role="switch"
      type="button"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      style={{ touchAction: 'manipulation' }}
      className={cn(
        "relative inline-flex h-[18px] w-[32px] shrink-0 cursor-pointer rounded-full border border-transparent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-slate-600",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-white ring-0 transition-transform",
          checked ? "translate-x-[14px]" : "translate-x-0"
        )}
      />
    </button>
  )
}

export { Switch }
