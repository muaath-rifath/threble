"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

function TooltipProvider({
  delayDuration = 300,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          // Glassmorphism background with proper backdrop blur
          "bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl",
          // Glass border matching your design system
          "border border-glass-border dark:border-glass-border-dark",
          // Rounded corners consistent with your components
          "rounded-2xl",
          // Text styling
          "text-black dark:text-white text-sm font-medium",
          // Padding and sizing
          "px-4 py-2.5 max-w-xs",
          // Shadow effects for depth
          "shadow-lg shadow-black/10 dark:shadow-black/30",
          // Animation states
          "animate-in fade-in-0 zoom-in-95 duration-200",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-150",
          // Slide animations per side
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          // Z-index and positioning - higher z-index to stay above posts
          "z-[60] origin-[--radix-tooltip-content-transform-origin]",
          // Text balance for better readability
          "text-balance",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow 
          className={cn(
            // Glassmorphism arrow background
            "fill-glassmorphism dark:fill-glassmorphism-dark",
            // Border matching the tooltip
            "stroke-glass-border dark:stroke-glass-border-dark stroke-[0.5px]",
            // Size and positioning - adjusted for better alignment
            "size-2.5",
            // Z-index to ensure proper stacking
            "z-[60]"
          )} 
        />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
