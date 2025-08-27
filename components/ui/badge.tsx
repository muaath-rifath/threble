import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-2xl border px-3 py-1.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-transparent backdrop-blur-xl",
  {
    variants: {
      variant: {
        default:
          "bg-primary-500/20 dark:bg-primary-500/20 border-primary-500/30 dark:border-primary-500/30 text-primary-600 dark:text-primary-400 hover:bg-primary-500/30 dark:hover:bg-primary-500/30",
        secondary:
          "bg-glassmorphism dark:bg-glassmorphism-dark border-glass-border dark:border-glass-border-dark text-black dark:text-white hover:bg-white/20 dark:hover:bg-white/10",
        destructive:
          "bg-red-500/20 dark:bg-red-500/20 border-red-500/30 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/30 dark:hover:bg-red-500/30",
        outline: 
          "border-glass-border dark:border-glass-border-dark bg-transparent text-black dark:text-white hover:bg-glassmorphism dark:hover:bg-glassmorphism-dark",
        success:
          "bg-green-500/20 dark:bg-green-500/20 border-green-500/30 dark:border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/30 dark:hover:bg-green-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
