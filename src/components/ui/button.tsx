import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] border text-sm font-semibold tracking-[0.08em] transition-all duration-200 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-transparent shadow-md hover:bg-primary/85 hover:shadow-lg",
        destructive:
          "bg-destructive text-destructive-foreground border-transparent shadow-md hover:bg-destructive/85",
        outline:
          "border-border/80 bg-white/70 text-foreground shadow-none hover:bg-white",
        secondary:
          "bg-secondary text-secondary-foreground border-transparent shadow-sm hover:bg-secondary/85",
        ghost:
          "border-transparent bg-transparent text-foreground hover:bg-accent/60",
        link: "text-primary underline-offset-[6px] hover:underline",
      },
      size: {
        default: "min-h-[44px] px-5 py-2.5 has-[>svg]:px-4",
        sm: "min-h-[38px] rounded-[calc(var(--radius-sm)-4px)] gap-1.5 px-4 py-2 has-[>svg]:px-3",
        lg: "min-h-[52px] rounded-[var(--radius-md)] px-7 py-3 has-[>svg]:px-5",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
