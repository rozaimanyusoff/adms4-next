"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"
import { useTextSize } from "@/contexts/text-size-context"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-3 w-full", className)}
      {...props}
    />
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
        "bg-gray-100 dark:bg-gray-800/50 text-muted-foreground inline-flex w-full min-w-0 items-center justify-start rounded-lg",
        // Responsive height and padding based on screen size
        "h-9 sm:h-10 md:h-11 px-1 sm:px-1.5",
        // Enable horizontal scroll on small screens
        "overflow-x-auto tabs-scroll",
        // Smooth scrolling behavior
        "scroll-smooth",
        // Add small gap between tabs
        "gap-0.5",
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
        
        // Active state with enhanced styling
        "data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        "data-[state=active]:font-semibold dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-gray-100",
        
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
        "mt-2 rounded-lg bg-white dark:bg-gray-800/30 p-4",
        // Responsive padding
        "p-3 sm:p-4 md:p-5",
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
