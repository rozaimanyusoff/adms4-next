import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "w-full rounded-full border px-4 py-2 text-sm font-semibold text-black outline-hidden! focus:ring-1 focus:ring-zinc-500 dark:border-[#17263c] dark:bg-[#121e32] dark:text-white-dark dark:focus:border-primary",
  {
    variants: {
      size: {
        sm: "py-1 text-xs",
        md: "py-2 text-sm",
        lg: "py-3 text-base",
      },
      state: {
        default: "border-zinc-200 bg-white/60",
        error: "border-red-500 bg-red-50",
        success: "border-green-500 bg-green-50",
      },
    },
    defaultVariants: {
      size: "md",
      state: "default",
    },
  }
);

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">, // Omit the conflicting `size` property
    VariantProps<typeof inputVariants> {
  size?: "sm" | "md" | "lg"; // Explicitly define the `size` property to match `inputVariants`
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, state, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ size, state, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
