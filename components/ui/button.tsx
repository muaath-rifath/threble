import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary-500 text-white shadow-lg shadow-primary-500/25 hover:bg-primary-600 hover:shadow-primary-500/40",
        destructive:
          "bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-600 hover:shadow-red-500/40",
        outline:
          "border border-glass-border dark:border-glass-border-dark bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl text-black dark:text-white hover:bg-white/20 dark:hover:bg-white/10",
        secondary:
          "bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark text-black dark:text-white hover:bg-white/20 dark:hover:bg-white/10",
        ghost:
          "text-black/60 dark:text-white/60 hover:bg-glassmorphism dark:hover:bg-glassmorphism-dark backdrop-blur-xl hover:text-black dark:hover:text-white",
        link: "text-primary-500 underline-offset-4 hover:underline hover:text-primary-600",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-2xl px-3 text-xs",
        lg: "h-10 rounded-2xl px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
