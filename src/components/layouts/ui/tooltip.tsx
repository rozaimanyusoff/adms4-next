"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cva, VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const tooltipVariants = cva(
  "z-50 overflow-hidden rounded-2xl max-w-[300px] px-3 py-1.5 text-sm text-dark shadow-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  {
    variants: {
      size: {
        sm: "text-xs px-2 py-1",
        md: "text-sm px-3 py-1.5",
        lg: "text-base px-4 py-2",
      },
      variant: {
        default: "text-popover-foreground",
        primary: "bg-primary text-white",
        secondary: "bg-indigo-600 border-none text-white",
      },
    },
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  }
)

interface TooltipProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>, VariantProps<typeof tooltipVariants> {
  content: string
  placement?: "top" | "bottom" | "left" | "right"
}

const Tooltip = ({ children, content, placement = "top", size, variant, ...props }: TooltipProps) => (
  <TooltipPrimitive.Root {...props}>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent
      side={placement}
      className={tooltipVariants({ size, variant })}
    >
      {content}
    </TooltipContent>
  </TooltipPrimitive.Root>
);
Tooltip.displayName = TooltipPrimitive.Root.displayName

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, tooltipVariants }
