"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"
import { useTextSize } from "@/contexts/text-size-context"

function Tabs({
  className,
  defaultValue,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  // Auto-select first tab if no defaultValue is provided
  const [autoDefaultValue, setAutoDefaultValue] = React.useState<string | undefined>(defaultValue)

  React.useEffect(() => {
    if (!defaultValue && !autoDefaultValue && children) {
      // Extract the first TabsTrigger value from children
      const findFirstTriggerValue = (children: React.ReactNode): string | undefined => {
        let firstValue: string | undefined

        React.Children.forEach(children, (child) => {
          if (firstValue) return

          if (React.isValidElement(child)) {
            // Check if this is a TabsTrigger and get its value
            if (child.props?.value && typeof child.props.value === 'string') {
              firstValue = child.props.value
            }
            // Recursively check children
            else if (child.props?.children) {
              firstValue = findFirstTriggerValue(child.props.children)
            }
          }
        })

        return firstValue
      }

      const firstValue = findFirstTriggerValue(children)
      if (firstValue) {
        setAutoDefaultValue(firstValue)
      }
    }
  }, [defaultValue, autoDefaultValue, children])

  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-3 w-full", className)}
      defaultValue={defaultValue || autoDefaultValue}
      {...props}
    >
      {children}
    </TabsPrimitive.Root>
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const { textSizeClasses } = useTextSize()

  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-gray-100 dark:bg-gray-800/50 text-muted-foreground inline-flex w-fit min-w-0 items-center justify-start rounded-lg",
        // Add lighter border
        "border border-gray-200/60 dark:border-gray-700/40",
        // Responsive height and padding based on screen size
        "h-9 sm:h-10 md:h-11 px-1 sm:px-0.5",
        // Enable horizontal scroll on small screens without visible scrollbar
        "overflow-x-auto scrollbar-hide",
        // Smooth scrolling behavior
        "scroll-smooth",
        // Add small gap between tabs
        "gap-0.5",
        // Hide scrollbars but maintain functionality
        "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { textSizeClasses } = useTextSize()

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // Base styles with responsive text size
        `${textSizeClasses.base} font-medium whitespace-nowrap transition-all duration-200 ease-in-out`,

        // Layout and spacing - responsive padding
        "inline-flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3",
        "h-[calc(100%-4px)] flex-shrink-0 rounded-md border border-transparent",
        "min-w-fit relative",

        // Default state
        "text-muted-foreground bg-transparent hover:bg-white/80 hover:text-foreground dark:hover:bg-gray-700/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",

        // Active state with enhanced styling and prominent background
        "data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md",
        "data-[state=active]:font-semibold dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white",
        "data-[state=active]:border-blue-600 data-[state=active]:hover:bg-blue-700",

        // Disabled state
        "disabled:pointer-events-none disabled:opacity-50",

        // Icon styling
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4 sm:[&_svg]:size-4 md:[&_svg]:size-5",

        // Mobile touch targets
        "touch-manipulation select-none",

        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  const { textSizeClasses } = useTextSize()

  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex-1 outline-none",
        // Enhanced content styling with clean background
        "mt-2 rounded-lg dark:bg-gray-800/30",
        // Responsive padding
        "p-0 sm:p-4 md:p-0",
        // Text size integration
        textSizeClasses.base,
        // Animation
        "data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:zoom-in-95",
        "data-[state=active]:duration-200",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
