import * as React from "react"

import { cn } from "@/lib/utils"

type InputVariant = "default" | "translucent"

interface InputProps extends React.ComponentProps<"input"> {
  variant?: InputVariant
}

const variantStyles: Record<InputVariant, string> = {
  default: "",
  translucent:
    "text-white placeholder:text-white/70 border-white/40 bg-white/[0.12] shadow-[0_20px_45px_rgba(15,23,42,0.35)] backdrop-blur focus-visible:border-white/70 focus-visible:ring-white/45 dark:text-white dark:placeholder:text-white/70 dark:border-white/40 dark:bg-white/[0.08]",
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type, variant = "default", ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-[length:var(--text-size-base)] shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-[length:var(--text-size-small)] file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/40",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
})

Input.displayName = "Input"

export { Input }
